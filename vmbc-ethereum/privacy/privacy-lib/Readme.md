# How to regenerate protobuf files

```
protoc -I=../ wallet-api.proto --js_out=import_style=commonjs,binary:. --grpc-web_out=import_style=commonjs,mode=grpcwebtext:.
```

issue reference:
https://github.com/grpc/grpc-web/issues/566
option reference:
https://github.com/protocolbuffers/protobuf-javascript/blob/main/generator/js_generator.h
