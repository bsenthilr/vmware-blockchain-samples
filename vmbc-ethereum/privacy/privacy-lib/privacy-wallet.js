const Web3 = require("web3");
const proto = require('./wallet-api_pb.js')
require('dotenv').config();
var VMBC_URL = process.env.VMBC_URL;
var web3 = new Web3(new Web3.providers.HttpProvider(VMBC_URL));
const BN = web3.utils.BN;
const sigRetryCount = 20;
const sigRetryDelayMs = 1000;

let grpc_callback = async function(call) {};
let send_transaction_callback = undefined;

const sleep = (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
}

function setVmbcUrl(url) {
    VMBC_URL = url;
    web3 = new Web3(new Web3.providers.HttpProvider(VMBC_URL));
}

async function sendTx(tx, account) {
    if (send_transaction_callback != undefined) {
        console.log("calling send transaction callback...");
        await send_transaction_callback(tx);
    } else {
        console.log("signing myself...");
        tx.from = account.address;
        tx.gas = 200000000;
        tx.gas_price = 0;

        const signature = await account.signTransaction(tx);
        await web3.eth.sendSignedTransaction(signature.rawTransaction);
    }
}

/* creates ethereum account from private key
*/
function _get_ethereum_account(ether_account_private_key) {
    if (ether_account_private_key != undefined) {
        if (send_transaction_callback != undefined) {
            console.error("caller registered transaction signature callback which takes precedence..");
            return undefined;
        } else {
            return web3.eth.accounts.privateKeyToAccount(ether_account_private_key);
        }
    }
    return undefined;
}
/**
 * set a callback for sending grpc requests
 * @param {async function} callback             async callback for sending grpc requests
 */
function set_grpc_callback(callback) {
    grpc_callback = callback;
}

/**
 * set a callback for sending transaction requests
 * @param {async function} callback
 *              async callback for sending transaction requests
 */
function set_transaction_callback(callback) {
    send_transaction_callback = callback;
}

/**
 * configure the backend wallet service
 * @param {string} privacy_contract_address     the privacy contract address
 * @param {string} privacy_contract_abi         the privacy contract abi
 * @param {string} privateKey                   an RSA private key in PKCS#8 PEM format
 * @param {string} publicKey                    an RSA public key in PKCS#8 PEM format
 * @param {string} user_id                      the public user id
 * @returns true on success, false on failure
 */
async function configure(privacy_contract_address, privacy_contract_abi, privateKey, publicKey, user_id) {
        const privacyContract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);
        let publicConfig = await privacyContract.methods.getPublicConfig().call();
        publicConfig = web3.utils.hexToBytes(publicConfig);

        let wallet_configure_req = new proto.PrivacyWalletConfigRequest();
        wallet_configure_req.setPrivateKey(privateKey);
        wallet_configure_req.setPublicKey(publicKey);
        wallet_configure_req.setUserId(user_id);
        wallet_configure_req.setPublicApplicationConfig(Uint8Array.from(publicConfig));

        let grpc_request = new proto.PrivacyWalletRequest();
        grpc_request.setPrivacyWalletConfigRequest(wallet_configure_req);
    
        const resp = await grpc_callback(grpc_request);
        return resp.getPrivacyWalletConfigResponse().getSucc();
}

/**
 * register a user to the privacy contract
 * @param {string} privacy_contract_address         the privacy contract address
 * @param {string} privacy_contract_abi             the privacy contract abi
 * @param {string} ether_account_private_key        the ethereum account private key
 * @param {string} certificate                      the user's certificate (PEM)
 * @returns true on success, false on failure
 */
async function register(privacy_contract_address, privacy_contract_abi, ether_account_private_key, certificate) {
    const user_registration_req = new proto.UserRegistrationRequest();
    let grpc_request = new proto.PrivacyWalletRequest();
    grpc_request.setUserRegistrationRequest(user_registration_req);

    const resp = await grpc_callback(grpc_request);
    if (resp.hasErr()) {
        console.log("failed to retrieve registration input: ", resp.getErr());
        return false;
    }
    const privacyContract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);
    const rcm1 = resp.getUserRegistrationResponse().getRcm1();
    const pid = resp.getUserRegistrationResponse().getPid();
    let userRegistered = await privacyContract.methods.isRegistered(pid).call();
    if (userRegistered) {
        console.log("user is already registered");
        return false;
    }

    // TODO: Add rcm1 sig to the contract method
    const register_req = {
        userId: pid,
        userPk: certificate,
        rcm1: rcm1
    };

    const tx = {
        to: privacyContract.options.address,
        data: privacyContract.methods.registerUser(register_req).encodeABI()
    };

    console.log("sending registration request to the privacy contract");
    await sendTx(tx, _get_ethereum_account(ether_account_private_key));

    // Wait until getting the full rcm signature
    
    const gen_s2 = await privacyContract.methods.getRegS2(register_req.userId).call();
    const sleep = (millis) => {
        return new Promise(resolve => setTimeout(resolve, millis));
    }

    let sig
    for (let i = 0; i < sigRetryCount; ++i) {
        sig = await privacyContract.methods.getRegSignature(register_req.userId).call();
        if (sig) {
            sig = web3.utils.hexToBytes(sig);
            break; // Done
        } else {
            await sleep(sigRetryDelayMs);
        }
    }

    let user_registration_update_req = new proto.UserRegistrationUpdateRequest();
    user_registration_update_req.setRcmSig(Uint8Array.from(sig));
    
    for (let i = 0; i < gen_s2.length; i++) {
        user_registration_update_req.addS2(new BN(gen_s2[i]).toString(), i);
    }
    let grpc_update_request = new proto.PrivacyWalletRequest();
    grpc_update_request.setUserRegistrationUpdateRequest(user_registration_update_req);
    
    const update_resp = await grpc_callback(grpc_update_request);
    return update_resp.getUserRegistrationUpdateResponse().getSucc();
}

/**
 * convert public tokens to private tokens
 * @param {string} privacy_contract_address             the privacy contract address
 * @param {string} privacy_contract_abi                 the privacy contract abi
 * @param {string} tokens_contract_address              the public token contract address
 * @param {string} tokens_contract_abi                  the public token contract abi            
 * @param {string} ether_account_private_key            the ethereum account private key
 * @param {string} user_id                              the public user id
 * @param {long long} value                             the requests minted tokens
 * @param {long long} next_sn                           the last known sequence id (the last known before the procedure has started)
 * @returns return a sequence number which is greater or equal to the transaction sequence number 
 */
async function convert_public_to_private(
    privacy_contract_address, 
    privacy_contract_abi, 
    tokens_contract_address, 
    tokens_contract_abi,
    ether_account_private_key, 
    user_id, 
    value, 
    next_sn) {
    let generate_mint_tx_req = new proto.GenerateMintTx();
    generate_mint_tx_req.setAmount(new BN(value).toString());
    let wallet_grpc_request = new proto.PrivacyWalletRequest();
    wallet_grpc_request.setGenerateMintTxRequest(generate_mint_tx_req);
    
    let resp = await grpc_callback(wallet_grpc_request);
    if (resp.hasErr()) {
        throw new Error(resp.getErr());
    }

    const ehter_mint_req = {
        userId: user_id,
        value: value,
        txData: resp.getGenerateTxResponse().getTx()
    }

    const tokens_contract = new web3.eth.Contract(tokens_contract_abi, tokens_contract_address);
    const tx = {
        to: tokens_contract.options.address,
        data: tokens_contract.methods.convertPublicToPrivate(ehter_mint_req).encodeABI()
    }
    await sendTx(tx, _get_ethereum_account(ether_account_private_key));
    return await sync_state(next_sn, privacy_contract_abi, privacy_contract_address)
}

async function get_signed_transaction(tx_num, privacyContract) {
    // TxType: MINT = 1, BURN = 2, TRANSFER = 3
    // Tx { data: bytes, type: TxType }
    // optionally: return sigs[]
    // function getTransaction(uint txNum) external returns (Tx);

    const tx = await privacyContract.methods.getTransaction(tx_num).call();
    const txType = parseInt(tx.txType);
    let txData = web3.utils.hexToBytes(tx.txData);

    const resp = {
        tx_type: txType,
        tx_data: txData,
        sigs: []
    }

    function sigsComplete(sigs) {
        if (sigs.length == 0) {
            return false;
        }
        for (let i = 0; i < sigs.length; ++i) {
            if (sigs[i].length == 0) {
                return false;
            }
        }
    
        return true;
    }

    if (txType != 2 /*TxType.Burn*/) { // Get signatures except for burns
        // POLL
        // function getTransactionSig(uint txNum) external returns (Signature);
        for (let i = 0; i < sigRetryCount; ++i) {
            sigs = await privacyContract.methods.getTransactionSigs(tx_num).call();
            if (sigsComplete(sigs)) {
                for (let j = 0; j < sigs.length; ++j) {
                    resp.sigs.push(web3.utils.hexToBytes(sigs[j]))
                }
                break; // Done
            } else {
                console.log("sigs not ready... retry in 1 sec");
                await sleep(sigRetryDelayMs);
            }
        }
    }
    return resp;
}

/**
 * Sync the state (based on the privacy contract's state)
 * @param {long long} from_sn                   the sequence number to start the sync with
 * @param {string} privacy_contract_abi         the sequence number to start the sync with
 * @param {string} privacy_contract_address     the privacy contract address
 * @returns the last known sequence number from the privacy contract at the time when this method was executed
 */

async function sync_state(from_sn,  privacy_contract_abi, privacy_contract_address) {
    const privacyContract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);
    const to_sn = await privacyContract.methods.getNumOfLastAddedTransaction().call();
    console.log("syncing state from:", from_sn, "to:", to_sn);
    if (from_sn > to_sn) {
        return null;
    }
    for (let tx_num = from_sn; tx_num <= to_sn ; tx_num++) {
        const data = await get_signed_transaction(tx_num, privacyContract);
        let claim_coins_request = new proto.ClaimCoinsRequest();
        claim_coins_request.setTx(Uint8Array.from(data.tx_data));
        for (let i = 0; i < data.sigs.length; i++) {
            claim_coins_request.addSigs(Uint8Array.from(data.sigs[i]), i);
        }
        claim_coins_request.setType(data.tx_type - 1);
        let wallet_grpc_req = new proto.PrivacyWalletRequest();
        wallet_grpc_req.setClaimCoinsRequest(claim_coins_request);
    
        const update_resp = await grpc_callback(wallet_grpc_req);
        if (!update_resp.getClaimCoinsResponse().getSucc()) {
            throw new Error("error while synchronizing state");
        }
    }
    
    return parseInt(to_sn);
}

/**
 * get the privacy state from the privacy wallet service
 * @returns a json of {balance: xxx, budget: xxx} representing the current privacy state that is held by the privacy service
 */
async function get_privacy_state() {
    let wallet_grpc_request = new proto.PrivacyWalletRequest();
    let get_state_request = new proto.GetStateRequest();
    wallet_grpc_request.setGetStateRequest(get_state_request);

    const state_resp = await grpc_callback(wallet_grpc_request);
    return {
        balance: state_resp.getGetStateResponse().getBalance(),
        budget: state_resp.getGetStateResponse().getBudget(),
        userId: state_resp.getGetStateResponse().getUserId()
    }
}

async function _transfer(privacy_contract, ether_account, num_output_coins, tx_data) {
    const transferReq = {
        txData: tx_data,
        numOutputs: num_output_coins
    }
    const tx = {
        to: privacy_contract.options.address,
        data: privacy_contract.methods.transfer(transferReq).encodeABI()
    }
    await sendTx(tx, ether_account)
}

/**
 * transfer a given amount of tokens to another privacy user
 * @param {string} privacy_contract_abi                 the privacy contract abi
 * @param {string} privacy_contract_address             the privacy contract address
 * @param {string} ether_account_private_key            the ethereum account private key
 * @param {string} recipient_id                         the recipient id
 * @param {bytes} recipient_public_key                  the recipient RSA public key (PKCS#8 PEM format)
 * @param {long long} value                             the number of tokens to transfer
 * @param {long long} next_sn                           the last known sequence number before this transaction
 * @returns a sequence number that is greater or equal to the latest transaction sequence number of this procedure
 */
async function transfer(privacy_contract_abi, 
    privacy_contract_address,
     ether_account_private_key, 
     recipient_id, 
     recipient_public_key, 
     value, 
     next_sn) {
        let generate_transfer_request = new proto.GenerateTransferTx();
        generate_transfer_request.setAmount(new BN(value).toString());
        generate_transfer_request.setRecipientPid(recipient_id);
        generate_transfer_request.setRecipientPublicKey(recipient_public_key);
        const wallet_grpc_request = new proto.PrivacyWalletRequest();
        wallet_grpc_request.setGenerateTransferTxRequest(generate_transfer_request);
        var resp = await grpc_callback(wallet_grpc_request);

        const privacy_contract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);
        
        while (true) {
            const generate_tx_resp = resp.getGenerateTxResponse();
            if (!generate_tx_resp.getFinal()) {
                console.log("merging coins");
            }
            await _transfer(privacy_contract, _get_ethereum_account(ether_account_private_key), parseInt(generate_tx_resp.getNumOfOutputCoins()), generate_tx_resp.getTx());
            next_sn = await sync_state(next_sn, privacy_contract_abi, privacy_contract_address) + 1;
            if (generate_tx_resp.getFinal()) {
                break;
            }
            // ask again for the final burn request
            resp = await grpc_callback(wallet_grpc_request);          
        }
        return next_sn - 1;
     }

/**
 * convert private token to public tokens (burn). Note that there might be an intermediate transaction to break an existing call
 * @param {string} tokens_contract_address              public tokens contract abi
 * @param {string} tokens_contract_abi                  public tokens contract address
 * @param {string} privacy_contract_abi                 privacy contract abi
 * @param {string} privacy_contract_address             privacy contract address
 * @param {string} ether_account_private_key            ethereum account private key
 * @param {string} user_id                              the public user id
 * @param {long long} value                             the number of tokens to convert
 * @param {long long} next_sn                           the last known sequence number prior to this transaction
 * @returns a sequence number that is greater or equal to the latest transaction sequence number of this procedure
 */
async function convert_private_to_public(tokens_contract_address, 
    tokens_contract_abi,
    privacy_contract_abi, 
    privacy_contract_address, 
    ether_account_private_key, 
    user_id, 
    value, 
    next_sn) {
    let generate_burn_request = new proto.GenerateBurnTx();
    generate_burn_request.setAmount(new BN(value).toString());
    const wallet_grpc_request = new proto.PrivacyWalletRequest();
    wallet_grpc_request.setGenerateBurnTxRequest(generate_burn_request);
    
    var resp = await grpc_callback(wallet_grpc_request);

    const privacy_contract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);
    const tokens_contract = new web3.eth.Contract(tokens_contract_abi, tokens_contract_address);
    const generate_tx_resp = resp.getGenerateTxResponse();
    if (!generate_tx_resp.getFinal()) {
        // we need to break a coin
        console.log("breaking coin transaction")
        await _transfer(privacy_contract, _get_ethereum_account(ether_account_private_key), parseInt(generate_tx_resp.getNumOfOutputCoins()), generate_tx_resp.getTx());
        next_sn = await sync_state(next_sn, privacy_contract_abi, privacy_contract_address) + 1;

        // ask again for the final burn request
        resp = await grpc_callback(wallet_grpc_request);
    }
    if (!resp.getGenerateTxResponse().getFinal()) {
        throw new Error("final transaction is required");
    }

    const burnReq = {
        userId: user_id,
        value: value,
        txData: resp.getGenerateTxResponse().getTx(),
    }
    const tx = {
        to: tokens_contract.options.address,
        data: tokens_contract.methods.convertPrivateToPublic(burnReq).encodeABI()
    }
    await sendTx(tx, _get_ethereum_account(ether_account_private_key));
    return await sync_state(next_sn, privacy_contract_abi, privacy_contract_address);
}

/**
 * gets the privacy budget token from the contract
 * @param {string} privacy_contract_abi             the privacy contract abi
 * @param {string} privacy_contract_address         the privacy contract address
 * @param {string} user_id                          the public user id
 * @returns true on success false on failure
 */
async function get_privacy_budget(privacy_contract_abi, privacy_contract_address, user_id) {
    const privacy_contract = new web3.eth.Contract(privacy_contract_abi, privacy_contract_address);

    let isBudgetSet = await privacy_contract.methods.checkPublicBudget(user_id).call();
    if (!isBudgetSet) {
        console.log("Budget coin was not set by admin");
        return false;
    }
    let budgetTx
    try{
        budgetTx = await privacy_contract.methods.getLatestPublicBudget(user_id).call();
    } catch(err) {
        console.log("got empty budgetData");
        return false;
    }
    let budgetData = web3.utils.hexToBytes(budgetTx);
    let sig;
    if(budgetData.length > 0){
        for (let i = 0; i < sigRetryCount; ++i) {
            sig = await privacy_contract.methods.getLatestPublicBudgetSig(user_id).call();
            if (sig.length > 0) {
                break; // Done
            } else {
                console.log("sig not ready... retry in 1 sec");
                await sleep(sigRetryDelayMs);
            }
        }
    }

    let claim_coins_request = new proto.ClaimCoinsRequest();
    claim_coins_request.setTx(Uint8Array.from(budgetData));
    claim_coins_request.addSigs(Uint8Array.from(sig), 0);
    claim_coins_request.setType(3);
    
    let wallet_grpc_req = new proto.PrivacyWalletRequest();
    wallet_grpc_req.setClaimCoinsRequest(claim_coins_request);

    const update_resp = await grpc_callback(wallet_grpc_req);
    if (!update_resp.getClaimCoinsResponse().getSucc()) {
        throw new Error("error while synchronizing state");
    }
    return true;
    
}

module.exports = {
    set_grpc_callback: set_grpc_callback,
    set_transaction_callback: set_transaction_callback,
    configure: configure,
    register: register,
    convert_public_to_private: convert_public_to_private,
    sync_state: sync_state,
    get_privacy_state: get_privacy_state,
    convert_private_to_public: convert_private_to_public,
    get_privacy_budget: get_privacy_budget,
    transfer: transfer,
    setVmbcUrl: setVmbcUrl,
}
