# captain

The "Ask the Captain" GenAI slice: an NgRx feature + HTTP service that send a
compact, pre-computed portfolio summary to the Captain Lambda (OpenAI) and hold
the chat thread and the daily-cached dashboard insight. Depends on `state` and
`util` only (one-way), so the `state → never → yahoo` invariant is untouched.
