# Test text

I use this dataset to compare how text detectors handle made-up personal details and secret-like values. It has 684 English and Spanish examples, with exact expected spans for positive examples and empty expected lists for negatives. It is small enough to inspect and rebuild, and broad enough to expose differences in formatting and checksum handling.

A JSONL line looks like this:

```json
{"id":"demo-1","text":"The test card is 4111 1111 1111 1111.","lang":"en","expect":[{"kind":"credit_card","span":[17,36]}],"style":["digits","spaced","in_sentence"]}
{"id":"demo-2","text":"The forecast says rain may arrive later.","lang":"en","expect":[],"style":["negative","in_sentence"]}
```

Offsets are zero-based Unicode code-point positions, with an exclusive end. `style` records visible forms such as `digits`, `spaced`, `dashed`, `number_words`, `misspelled`, `mixed`, `code_block`, and `spanish`. The rows are synthetic examples, not real people, accounts, or credentials.

I wrote the source examples while building similar cases for Clotr's pattern tests. `build.js` uses a fixed seed to recreate `examples.jsonl`; `validate.js` checks JSONL shape, unique IDs, spans, and the checksums used for valid examples.

## Score a detector

Write one JSON object per example to a findings file. Offsets use the same code-point convention:

```json
{"id":"pos-credit_card-01","findings":[{"kind":"credit_card","start":18,"end":37}]}
```

From the repository root, run:

```sh
node test-text/score.js --findings findings.jsonl
```

For a comparison point, run the included deliberately simple regex baseline:

```sh
node test-text/score.js --baseline
```

The scorer prints precision and recall by kind and style. It uses exact spans, so a wrong boundary counts as a false positive and the missed expected span counts as a false negative. The baseline is only an example and does not benchmark or recommend a named tool.

## Keys and privacy

The AWS rows repeat `AKIAIOSFODNN7EXAMPLE`, a public AWS documentation example. The other provider-shaped values deliberately break the provider prefix separator: GitHub uses `ghp-` instead of `ghp_`, and the OpenAI-shaped value uses `sk:` instead of `sk-`. They remain recognizable as examples but do not match those provider token regexes. `validate.js` checks these shapes and allowlists the AWS documentation value.

The BIP-39 English word list is included under its MIT license from the [Bitcoin BIPs repository](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt); the BIP-39 specification lists the MIT license. The generated phrases use random-looking fixed-seed entropy and valid BIP-39 checksums. They are test phrases only and must never be used as wallet recovery phrases.

## Citation and licenses

Please cite this dataset with [`CITATION.cff`](../CITATION.cff). The examples are CC BY 4.0, including `examples.jsonl`; `build.js`, `validate.js`, and `score.js` are MIT. The BIP-39 word list has its own MIT license in `LICENSES/`.



