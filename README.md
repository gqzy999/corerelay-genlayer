# CoreRelay

[Live application](https://gqzy999.github.io/corerelay-genlayer/) · [Application source](https://github.com/gqzy999/corerelay-genlayer) · [SampleScope primitive](https://github.com/gqzy999/sample-scope-primitive)

A geological sample stewardship desk using GenLayer for source-grounded policy assessment and on-chain request transitions.

## Try the application

Use **Read finalized example** on the homepage to load the on-chain record without connecting a wallet. Expand **Registered plan & history**, then export the JSON record.

## Run

Requires Node.js 20+.

```sh
npm ci
npm run dev
npm test
npm run build
```

The production output is `dist/`, built with relative asset paths for static hosts including GitHub Pages. The application pins GenLayerJS 1.1.8 and uses the stable `studionet` chain definition (61999). This SDK version uses `waitForTransactionReceipt` and a zero-value write on stable Studio; it does not target the separate Studio-dev network or fee-charging preview APIs.

## Connect and operate

1. Use **Read finalized example** to inspect the configured live record without a wallet. For a new workflow, keep the configured contract or deploy `contracts/sample_scope.py` with your own curator wallet.
2. Connect an EIP-1193 browser wallet to Studionet.
3. Paste the deployed address, choose a unique request ID, and enter the sample reference, expedition URL and research plan. The example button fills illustrative inputs only.
4. Register, wait for finalized execution, and read the record.
5. Assess policy; inspect all four gates and quotations.
6. From the deployment curator wallet, add a decision note and authorize or decline an eligible request.
7. After actual off-chain return/report verification, close the authorized request with an evidence reference.
8. Read the record and export JSON.

A saved transaction hash can be tracked after reload or timeout. New writes are blocked while that transaction remains unresolved. Both finalized status and successful execution are required before the UI reports completion. A finalized, explicitly failed execution releases the write lock and retains the terminal receipt in browser storage. Unknown results and timeouts retain the pending hash and block another write. Storage is checked before signing; a storage error after submission retains the hash in memory and displays it for copying. Do not blindly resubmit an unclear transaction. Pending transaction data is browser-local, so use the same browser to resume.

## Deployment status

The configured Studionet contract is `0x0A096B8E7E0ffC377DFEb37ae34E1Fb1bAF588F0`. Read request `CoreRelay-353-live-003` to inspect the completed example. `evidence/studionet.json` records the five finalized successful transaction hashes for the example lifecycle.

Run `npm run verify:live` for read-only verification of source equality, history, curator and all five transaction results. The example is an illustrative workflow record; no physical sample was held or approved. Curator actions are restricted to the dedicated test deployment operator.

A separate desktop browser test with OKX Wallet on Studionet (chain ID 61999) verified wallet connection, request registration, record readback, and a finalized assessment transaction for request `CR-1792695507284`. The transaction finalized with consensus accepted and execution success: `0x21f0d4b88127f58d16e7852551b42dec9b84f8efb6e1ba9a769e5b4c83cdcd2c`. The request reached `CURATOR_REVIEW`, but all four policy gates still displayed “No policy evidence recorded”; this verifies the browser-wallet write and state-transition path, not a completed evidence-backed policy assessment. Curator-only authorize/decline/close actions and mobile wallet interactions have not been verified.

## Design and data

Responsive CSS geological core illustration; no generated images or proprietary assets. Optional Google Fonts fall back to system fonts. No backend, external AI key or private key is embedded. Policy access and LLM evaluation happen inside the Intelligent Contract. Browser storage holds settings, a pending transaction pointer and the last terminal receipt; authoritative records are read from chain. Source documents and research plans are untrusted input. The deployment curator role is technical access control, not verification of institutional authority.

See `docs/contract.md` for consensus semantics, limitations and test coverage.

`src/deployment.json` holds the network and optional deployment address/hash. The deployed address, deployment hash and example request are configured. No wallet key is stored in configuration.

## Local checks

19 frontend logic tests cover finalized success vs failure, receipt variants, timeout recovery, storage failures, role gates, stale record selection, URL validation and wallet rejection messages. These automated logic tests are separate from the recorded live lifecycle. Production build succeeds. Desktop browser checks cover live record loading, history display, JSON export, and the OKX Wallet registration/assessment flow described above. Mobile layout and mobile wallet interactions remain unverified; curator-only authorize/decline/close actions have not been browser-verified.
