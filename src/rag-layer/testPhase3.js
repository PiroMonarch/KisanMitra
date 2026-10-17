
import ragLayer from './index.js';

async function testPhase3() {
    console.log("Initializing Phase 3 Test...");
    ragLayer.initialize({ mode: 'offline' });

    const farmerProfile = {
        state: "UP",
        farmer_type: "owner",
        landholding: "marginal"
    };

    console.log("\n--- Test 1: Document Verification (Aadhaar) ---");
    const q1 = "Is Aadhaar required for KCC?";
    const res1 = await ragLayer.answerFollowUp("KCC", q1, farmerProfile);
    console.log("Q1:", q1);
    console.log("A1:", JSON.stringify(res1.answer || res1, null, 2));

    console.log("\n--- Test 2: Interest Rate ---");
    const q2 = "What is the interest rate for KCC?";
    const res2 = await ragLayer.answerFollowUp("KCC", q2, farmerProfile);
    console.log("Q2:", q2);
    console.log("A2:", JSON.stringify(res2.answer || res2, null, 2));

    console.log("\n--- Test 3: Off-Topic / Refusal ---");
    const q3 = "Should I buy a tractor?"; // Not in KCC docs
    const res3 = await ragLayer.answerFollowUp("KCC", q3, farmerProfile);
    console.log("Q3:", q3);
    console.log("A3:", JSON.stringify(res3.answer || res3, null, 2));
}

testPhase3();
