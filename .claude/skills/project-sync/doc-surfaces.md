# Documentation surfaces

What a project must document, kind by kind. A **surface** is anything that exists in the project
and that someone needs to know to build, run, test, ship, operate or use it. Every surface that
exists has **one document**, listed in `docs/README.md`, updated in the same change as the code.

The list below is a catalogue of common surfaces, not a closed list: the last section covers
anything else.

## Writing rules for every surface document

- Start with one sentence saying what it covers and who reads it.
- **Facts only**, verified in the code or by running the command. What you could not verify is
  written as `Unknown:` with who can answer, and is also recorded as an open question.
- One home per fact. Link to the source of truth (a path, a schema, a generated reference)
  instead of copying it, and prefer a generated reference (OpenAPI, CLI `--help`, schema dump) to
  a hand-written copy when the code is the source of truth.
- Commands are copy-pasteable and were checked against the manifest or run.
- Keep it under about 200 lines; split by topic when it grows.
- Add or update its row in `docs/README.md`: *Document*, *What it answers*, *Covers* (the paths
  it describes, in code spans — `scripts/check-docs.mjs` reads them to check coverage and
  freshness), *Update when*.
- Never document something that does not exist. A surface that does not exist yet gets its
  document in the change that introduces it.

## Surfaces

### HTTP or RPC interface
- **Signals**: route or controller files, `openapi.*` / `swagger.*`, GraphQL schema, protobuf files.
- **Default document**: `docs/api.md`
- **Must contain**: base URL and versioning, authentication, each endpoint or operation with
  request and response shape, error format and codes, rate limits, how the contract is validated.
- **Update when**: a route, handler, schema or error behaviour changes.

### Command-line interface
- **Signals**: `bin` entries, argument-parser code (commander, argparse, clap, cobra…).
- **Default document**: `docs/cli.md`
- **Must contain**: every command and flag, exit codes, environment variables read, examples.
- **Update when**: a command, flag or exit code changes.

### Data model
- **Signals**: schema files, migrations, ORM models, SQL files.
- **Default document**: `docs/data-model.md`
- **Must contain**: entities and relations, invariants the database does not enforce, how
  migrations are created and applied, backup-relevant facts, personal-data columns.
- **Update when**: the schema or a migration changes.

### Events and messaging
- **Signals**: broker or queue clients, topic or exchange names, event type constants.
- **Default document**: `docs/events.md`
- **Must contain**: catalogue of event types with payloads, producers and consumers, delivery and
  ordering guarantees, retry and dead-letter behaviour.
- **Update when**: an event, producer, consumer or guarantee changes.

### Configuration
- **Signals**: environment variable reads, config files, `.env.example`.
- **Default document**: `docs/configuration.md`
- **Must contain**: each variable (name, purpose, default, required or optional, secret or not),
  where each is set per environment, how a missing required value is reported.
- **Update when**: a variable or config file is added, renamed, removed or its meaning changes.

### Getting started
- **Signals**: manifests, `Makefile`, `docker-compose.*`, a `README`.
- **Default document**: `README.md` (or `docs/getting-started.md` when the README must stay short)
- **Must contain**: prerequisites, install, run locally, run the tests, the commonest problems.
- **Update when**: a prerequisite, command or setup step changes.

### Testing
- **Signals**: test directories and files, runner configs, coverage settings, e2e specs.
- **Default document**: `docs/testing.md`
- **Must contain**: the test levels and what each covers, how to run each, where tests live,
  coverage gate, fixtures and test data, what is deliberately not tested.
- **Update when**: a level, runner, command, gate or layout changes.

### CI/CD
- **Signals**: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, other pipeline files.
- **Default document**: `docs/ci.md`
- **Must contain**: each pipeline with its trigger and steps, what blocks a merge, secrets and
  variables it uses (names only), how to reproduce a run locally, expected duration.
- **Update when**: a workflow, trigger, step or required check changes.

### Deployment and environments
- **Signals**: `Dockerfile`, `docker-compose.*`, `infra/`, Kubernetes or Terraform files, deploy
  scripts.
- **Default document**: `docs/deployment.md`
- **Must contain**: the environments and how they differ, how to deploy and to roll back, how a
  release is cut, required infrastructure and its configuration, who can do it.
- **Update when**: an image, manifest, script, environment or release step changes.

### Operations
- **Signals**: logging and metrics setup, health endpoints, backup scripts, monitoring configs.
- **Default document**: `docs/operations.md`
- **Must contain**: health checks, logs and where to read them, metrics and alerts, backup and
  restore procedure, runbooks for known failures.
- **Update when**: an observability setting, backup job or runbook changes.

### Security and privacy
- **Signals**: authentication code, password or token handling, columns holding personal data.
- **Default document**: `docs/security.md`
- **Must contain**: the authentication and authorisation model, how secrets are managed, personal
  data inventory with retention, export and deletion paths, known limits.
- **Update when**: auth, secret handling or personal-data handling changes.

### Accessibility
- **Signals**: a user interface, accessibility tests or linters.
- **Default document**: `docs/accessibility.md`
- **Must contain**: the target level, how it is checked (automated and manual), known gaps.
- **Update when**: the target, the checks or a known gap changes.

### User guide
- **Signals**: a user interface or a CLI meant for end users.
- **Default document**: `docs/user-guide.md`
- **Must contain**: what the user can do, task by task, with the steps (and screens or output
  where they help).
- **Update when**: a user-visible behaviour changes.

### Contributing and releasing
- **Signals**: a PR template, tags or a changelog, branch rules.
- **Default document**: `CONTRIBUTING.md`; release and versioning in `docs/releasing.md`
- **Must contain**: how to propose a change, review and merge rules, versioning scheme, how a
  release is made.
- **Update when**: a process rule changes.

### Anything else: technologies, services and tools
- **Signals**: a dependency, service, platform or tool that a newcomer would not guess from the
  code — a database, queue, cache, search engine, payment or auth provider, cloud service,
  framework with project-specific conventions, code generator.
- **Default document**: `docs/technologies.md`, one section per item; an item with a lot to say
  gets its own `docs/<name>.md`.
- **Must contain**: what it is used for, why it was chosen (link the ADR), how it is configured,
  how to run or fake it locally and in tests, known pitfalls.
- **Update when**: it is added, replaced, reconfigured or removed.

This is also the catch-all rule: if something exists that none of the sections above describes,
it still gets a document, with the same rules.
