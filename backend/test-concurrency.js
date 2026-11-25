
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.TOKEN;
const RESOURCE_ID = process.env.RESOURCE_ID;

if (!TOKEN || !RESOURCE_ID) {
    console.error("Missing TOKEN or RESOURCE_ID environment variable");
    process.exit(1);
}

// Generate a future UTC time aligned to a 30-minute boundary
const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
start.setUTCSeconds(0, 0);
start.setUTCMinutes(Math.ceil(start.getUTCMinutes() / 30) * 30);

const end = new Date(start.getTime() + 30 * 60 * 1000);


const bookingData = {
    resourceId: RESOURCE_ID,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: "Concurrency test - same time slot"
};

async function createBooking(requestNumber) {
    try {
        const response = await fetch(`${BASE_URL}/api/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${TOKEN}`
            },
            body: JSON.stringify(bookingData)
        });

        const body = await response.json();

        console.log(
            `Request ${requestNumber}: HTTP ${response.status}`,
            body
        );

        return response.status;
    } catch (error) {
        console.error(`Request ${requestNumber} failed:`, error.message);
        return 0;
    }
}

async function runTest() {
    console.log("\nStarting 10 concurrent booking requests...\n");

    console.log("Resource:", RESOURCE_ID);
    console.log("Start:", bookingData.startTime);
    console.log("End:", bookingData.endTime);

   
    const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
            createBooking(i + 1)
        )
    );

    const successCount = results.filter(s => s === 201).length;
    const conflictCount = results.filter(s => s === 409).length;
    const otherCount = results.length - successCount - conflictCount;

    console.log("\n========== TEST SUMMARY ==========");
    console.log("Total requests:", results.length);
    console.log("Successful (201):", successCount);
    console.log("Conflicts (409):", conflictCount);
    console.log("Other responses:", otherCount);

    if (successCount === 1 && conflictCount === 9) {
        console.log("\nPASS: Race condition test successful!");
    } else {
        console.log("\nFAIL: Expected exactly 1 success and 9 conflicts.");
    }
}

runTest();
