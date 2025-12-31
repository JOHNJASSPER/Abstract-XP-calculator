document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const currentTierSelect = document.getElementById('current-tier');
    const currentXpInput = document.getElementById('current-xp');
    const targetTierSelect = document.getElementById('target-tier');
    const weeklyXpInput = document.getElementById('weekly-xp');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsContainer = document.getElementById('results');

    // Result Elements
    const xpNeededDisplay = document.getElementById('xp-needed');
    const timeRemainingDisplay = document.getElementById('time-remaining');
    const estimatedDateDisplay = document.getElementById('estimated-date');
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');

    // Configuration based on User Research
    // "Size" is the XP needed to complete this tier and reach the next one.
    const TIER_DATA = [
        { name: 'Bronze', size: 1000 },         // 0 -> 1000 (To Silver)
        { name: 'Silver', size: 100000 },       // 0 -> 100000 (To Gold)
        { name: 'Gold', size: 1000000 },        // 0 -> 1000000 (To Platinum)
        { name: 'Platinum', size: 5000000 },    // 0 -> 5000000 (To Obsidian)
        { name: 'Obsidian', size: 8000000 },    // 0 -> 8000000 (To Ethereal)
        { name: 'Ethereal', size: 0 }           // Top Tier
    ];

    // Helper: Update placeholder based on current tier
    function updateCurrencyPlaceholder() {
        const tierIndex = parseInt(currentTierSelect.value);
        const tier = TIER_DATA[tierIndex];
        if (tier && tier.size > 0) {
            currentXpInput.placeholder = `Max ${(tier.size - 1).toLocaleString()}`;
        } else {
            currentXpInput.placeholder = "Max Level Reached";
        }
    }

    // Smart default: When picking a current tier, set target to the next one
    currentTierSelect.addEventListener('change', () => {
        updateCurrencyPlaceholder();
        const currentIndex = parseInt(currentTierSelect.value);
        const nextIndex = currentIndex + 1;

        // Try to select next tier if valid
        const options = Array.from(targetTierSelect.options);
        const nextOption = options.find(opt => parseInt(opt.value) === nextIndex);
        if (nextOption) {
            targetTierSelect.value = nextIndex;
        } else if (currentIndex === TIER_DATA.length - 1) {
            // If Ethereal selected, maybe undefined behavior?
            // Usually you can't go higher.
        }
    });

    // Initialize placeholder
    updateCurrencyPlaceholder();

    calculateBtn.addEventListener('click', () => {
        // 1. Get Values
        const currentTierIndex = parseInt(currentTierSelect.value);
        const targetTierIndex = parseInt(targetTierSelect.value);
        const currentXp = parseInt(currentXpInput.value) || 0;
        const weeklyXp = parseInt(weeklyXpInput.value) || 0;

        // 2. Validation
        if (weeklyXp <= 0) {
            alert("Please enter a valid weekly average XP (greater than 0).");
            return;
        }

        if (targetTierIndex <= currentTierIndex) {
            alert("Target Tier must be higher than Current Tier!");
            return;
        }

        // Validate Current XP isn't impossibly high for the tier
        const currentTierMax = TIER_DATA[currentTierIndex].size;
        if (currentXp >= currentTierMax) {
            alert(`You already have enough XP to complete ${TIER_DATA[currentTierIndex].name}! Please select the next tier.`);
            return;
        }

        // 3. Calculation Logic (Iterative Sum)
        let totalXpNeeded = 0;

        // a. Remaining XP in current tier
        // "XP Resets to 0", so we need (Size - Current) to finish this tier.
        totalXpNeeded += (currentTierMax - currentXp);

        // b. Full XP for intermediate tiers
        // Start from next tier, up to (but not including) target tier (wait, Target Tier acts as the destination)
        // If Target is Silver (Index 1), and Current is Bronze (Index 0).
        // Loop from 0+1=1 to 1-1=0? No.
        // If Target is Gold (Index 2). Current Bronze (0).
        // 1. Finish Bronze.
        // 2. Add full Silver size.
        // 3. Done (Arrived at Gold).

        for (let i = currentTierIndex + 1; i < targetTierIndex; i++) {
            totalXpNeeded += TIER_DATA[i].size;
        }

        const weeksNeeded = totalXpNeeded / weeklyXp;
        const daysNeeded = Math.ceil(weeksNeeded * 7);
        const monthsNeeded = (weeksNeeded / 4.345).toFixed(1);

        // 4. Date Projection (Aligned to Tuesday)
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + daysNeeded);

        // Adjust to next Tuesday
        // Day 2 is Tuesday (Sunday=0, Monday=1, Tuesday=2...)
        const dayOfWeek = futureDate.getDay();
        if (dayOfWeek !== 2) {
            // Calculate days to add to get to next Tuesday
            // if day is 3 (Wed), need 6 days ((2 + 7 - 3) % 7) = 6? 
            // Formula: (targetDay + 7 - currentDay) % 7. If 0, it is today, but we might want *next* week if it passed? 
            // Assuming if it lands exactly on Tuesday we are good.

            let daysUntilTuesday = (2 + 7 - dayOfWeek) % 7;
            if (daysUntilTuesday === 0) daysUntilTuesday = 7; // Optional: if we want strictly *next* Tuesday if today is Tuesday? 
            // Actually, if the raw math lands on Tuesday, accept it. 
            // If it lands on Wed, we have to wait for next Tuesday.

            // Correction: If dayOfWeek != 2, we just add the diff.
            if (daysUntilTuesday === 0 && dayOfWeek !== 2) {
                // Should not happen with % 7 logic if dayOfWeek != 2
            }

            futureDate.setDate(futureDate.getDate() + daysUntilTuesday);
        }

        // 5. Update UI
        resultsContainer.classList.remove('hidden');

        xpNeededDisplay.textContent = totalXpNeeded.toLocaleString();

        let timeString = `${Math.ceil(weeksNeeded)} Weeks`;
        if (monthsNeeded > 0) {
            timeString += ` / ${monthsNeeded} Months`;
        }
        timeRemainingDisplay.textContent = timeString;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        estimatedDateDisplay.textContent = futureDate.toLocaleDateString(undefined, options);

        // Progress Bar
        // We know Total Needed.
        // We can surmise "Total Distance" as (Total Needed + Current XP already earned this tier + XP earned in prev tiers?)
        // User probably just wants "Percent Complete of this specific journey".
        // Journey Size = (Total XP Needed + Current XP they already inputted for the first leg).

        // Wait, if I am Bronze 900/1000. Goal Silver.
        // Needed = 100.
        // Journey Total = 1000 (The full Bronze bar).
        // % = 90%.

        // If I am Bronze 900/1000. Goal Gold.
        // Needed = 100 (for Bronze) + 100,000 (for Silver). = 100,100.
        // Journey Total = 1000 + 100,000 = 101,000.
        // % = (101,000 - 100,100) / 101,000 = 900 / 101,000 = ~0.8%.

        // This makes sense. The "Journey" is the cumulative sum of all relevant tiers.
        let journeyTotalXp = 0;
        // Size of Current Tier
        journeyTotalXp += currentTierMax;
        // Size of intermediates
        for (let i = currentTierIndex + 1; i < targetTierIndex; i++) {
            journeyTotalXp += TIER_DATA[i].size;
        }

        // Current Progress absolute amount = (journeyTotalXp - totalXpNeeded)
        // Which should basically equal `currentXp` if the only progress we have is in the first tier.
        // Yes, because we haven't started the subsequent tiers.

        let percentage = (currentXp / journeyTotalXp) * 100;

        // Sanity check
        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;

        progressFill.style.width = '0%'; // Reset for anim
        setTimeout(() => {
            progressFill.style.width = `${percentage}%`;
        }, 100);
        progressPercentage.textContent = `${percentage.toFixed(1)}% of Journey`;

        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // Download Card Logic
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', () => {
        // Hide button for screenshot
        downloadBtn.style.display = 'none';

        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            alert('Error: html2canvas library not loaded.');
            downloadBtn.style.display = 'block';
            return;
        }

        html2canvas(resultsContainer, {
            backgroundColor: '#0a0a0a', // specific background color
            scale: 2 // high res
        }).then(canvas => {
            // Restore button
            downloadBtn.style.display = 'block';

            const link = document.createElement('a');
            link.download = 'abstract-xp-journey.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    });
});
