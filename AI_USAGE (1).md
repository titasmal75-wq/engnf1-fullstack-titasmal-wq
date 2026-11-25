# AI_USAGE.md — TriageSync

## AI tools used during the 2-day assessment

| AI tool | How it was used | How the output was handled |
|---|---|---|
| **ChatGPT (OpenAI)** | Assisted with planning and building parts of the React frontend, including page structure, UI components, and connecting frontend screens to backend API responses. | I reviewed the suggestions, adapted them to the existing project structure, and checked the screens and API integration in the running application. |
| **ChatGPT (OpenAI)** | Helped understand and debug backend errors and improve error handling, including interpreting error messages, identifying likely causes, and shaping clearer API error responses. | I checked the proposed fixes against the actual code and tested the affected requests rather than assuming the suggested solution was correct. |
| **ChatGPT (OpenAI)** | Helped explain implementation choices, review endpoint behavior, and prepare project documentation for the assessment. | I compared the documentation with the implemented API behavior and recorded test results where available. |

No other AI tools are listed because ChatGPT is the AI tool used for the work described above.

## Example of verifying or overriding an AI suggestion

During the performance work for `GET /api/tickets?limit=100`, an AI-assisted suggestion was to add an index on `createdAt` because the endpoint sorts tickets by that field. I did not assume that adding the index would automatically make the endpoint significantly faster.

I checked the MongoDB query plan using `explain("executionStats")`. The plan used the `createdAt_-1` index with an `IXSCAN`, returned 100 records, examined 100 keys and 100 documents, and did not use a collection scan. I then compared the measured HTTP response times using the same 517-ticket dataset:

| Measurement | Before index | After index |
|---|---:|---:|
| Average response time (10 requests) | 117.4 ms | 117.1 ms |
| Minimum | 114 ms | 113 ms |
| Maximum | 120 ms | 128 ms |

The average changed by only **0.3 ms (about 0.26%)**, which is not a meaningful end-to-end latency improvement. I therefore did not describe the index as a major performance improvement. I documented the query-plan evidence and the small measured timing change, including the trade-off that indexes consume storage and add write-maintenance overhead.

This was an example of using AI as an assistant rather than treating its output as authoritative: I verified the suggestion with MongoDB execution statistics and repeatable HTTP measurements, then reported the actual result instead of overstating the benefit.

## Responsibility

AI-generated explanations and code suggestions were treated as drafts. I remained responsible for reviewing the implementation, testing API behavior, checking frontend integration, protecting secrets, and ensuring that the final documentation reflected the observed application behavior.
