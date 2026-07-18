| # | Question | Blocks |
|---|---|---|
| O1 | **Which platform** went to prod this week + **what workflow** does it touch? | The whole org demo (`demo_org_change_delta.md`) |
nxtyou.io - it is the direct to consumer version of docuspa.  See /Users/cameronhightower/Software_Projects/SKMD/CLAUDE.md
| O2 | **What in-your-head glue** did it introduce (the thing the probe stalls on)? | The probe's stall point |
Many integrations with docuspa - nxt you has its own front end but shares a backend and NP provider pool with docuspa as well as scheduling and provider availability endpoints as well as some components in the telhealth views.  I documented these pretty well in the monorepo root docs, though.  My monthly billing script that calculates usage and invoice price for client needs ot be updated - haven't done that yet.  There are a bunch of things post initial consult related to patient progress reports and follow up calls that I've tested but needs further testing - this is noted in my Notion document.  I am really good at documentation so I cant tell you anything I havent already documetned somewhere.  
| O3 | Probe **option A / B / C**? (recommend B — run the workflow end-to-end) | Probe authoring |
I am not sure yet, we can lock this later
| O4 | Which **surfaces** does that workflow span (Drive / Gmail / which repo / platform dashboard)? | Probe access wiring |
Deployment announcement (that an event driven or alway son agent coul dhave caught) was in a gmail thread, domain went live on vercel/godaddy, many commits to github - auto deployed to render and vercel, db on aws rds, repo is SKMD monorepo, Notion is where i manage tasks, Quo is where I receive business messages (hooked up to Juniper)
| O5 | Automated **trigger** for the demo, or narrate the heartbeat + show the delta? | Scope of the event-driven layer |
I am not sure yet, we can lock this later
| O6 | What **GPU** will Brev realistically grant (single vs 4×H100)? → fixes candle tier (L7) | Candle sizing, VRAM |
I am not sure - waht do you think?
| O7 | Which **frontier model** for remediation authoring (frontier API vs biggest Nemotron)? | Remediation quality |
Sonnet 5 or biggest nemotron - what do you think?