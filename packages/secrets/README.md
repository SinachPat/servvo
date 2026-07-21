# @servvo/secrets

Vendor OAuth token custody via envelope encryption.

A per-brand data key encrypts the token set; the data key is wrapped by a master key
(cloud KMS in production). The database stores only a `secretRef` and wrapped
ciphertext — **never a plaintext token**.

`LocalKeyWrapper` is development-only and refuses to construct when
`NODE_ENV=production`. Generate a dev key with `openssl rand -base64 32`.

Tokens refresh ahead of expiry (default 60s skew) so an in-flight request never races
the boundary. Disconnect revokes at the vendor and purges the secret.
