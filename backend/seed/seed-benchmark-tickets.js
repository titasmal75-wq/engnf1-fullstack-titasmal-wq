
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.TOKEN;

const TOTAL = 500;
const BATCH_SIZE = 50;
const PREFIX = "BENCHMARK-20261125";

if (!TOKEN) {
    console.error("Access token missing!");
    console.error('Run: $env:TOKEN="YOUR_ACCESS_TOKEN"');
    process.exit(1);
}

const examples = [
    {
        subject: "Unable to access employee portal",
        body: "The employee portal returns an error after login."
    },
    {
        subject: "Payment page loading slowly",
        body: "The payment page takes too long to load."
    },
    {
        subject: "Email notifications not arriving",
        body: "Users are not receiving email notifications."
    },
    {
        subject: "Application crashes during upload",
        body: "The application crashes when uploading a document."
    },
    {
        subject: "Account profile update request",
        body: "Please update the account profile details."
    },
    {
        subject: "Dashboard shows incorrect totals",
        body: "The dashboard totals do not match the detailed report."
    }
];

const tickets = Array.from({ length: TOTAL }, (_, i) => {
    const number = String(i + 1).padStart(4, "0");
    const example = examples[i % examples.length];

    return {
        externalId: `${PREFIX}-${number}`,
        subject: `${example.subject} [${number}]`,
        body: `${example.body} Synthetic benchmark ticket ${number}.`
    };
});

async function main() {
    console.log(`Preparing ${TOTAL} synthetic tickets...`);

    for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
        const batch = tickets.slice(i, i + BATCH_SIZE);

        const response = await fetch(
            `${BASE_URL}/api/tickets/import`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ tickets: batch })
            }
        );

        const result = await response.text();

        if (!response.ok) {
            console.error(`Batch ${i / BATCH_SIZE + 1} failed!`);
            console.error("HTTP:", response.status);
            console.error(result);
            process.exit(1);
        }

        console.log(
            `Batch ${i / BATCH_SIZE + 1}: HTTP ${response.status} (${i + batch.length}/${TOTAL})`
        );
    }

    console.log("Finished submitting 500 synthetic tickets.");
    console.log("Verify the actual document count in MongoDB.");
}

main().catch(error => {
    console.error("Error:", error);
    process.exit(1);
});
