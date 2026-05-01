## Summary

<!-- What does this PR do, and why? -->

## Checklist

- [ ] A [changeset](https://github.com/changesets/changesets) has been added (run `npm run changesets:add`), or the `skip changeset` label is set on this PR
- [ ] `npm test` passes locally (linting, types, unit tests)
- [ ] If behaviour changed, [ARCHITECTURE.md](../ARCHITECTURE.md) and/or [SECURITY.md](../SECURITY.md) and the user-facing docs in `docs/` have been updated
- [ ] If a new IPC channel was added, it uses an `IPC_EVENTS` enum entry from `src/constants.ts` and validates inbound payloads with a Zod schema
