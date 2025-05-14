async function generate_random_cards() {
    document.getElementById("section_randomCards").innerHTML = `
        <h2 class="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">Random Highlights</h2>
        <div id="randomCards" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="p-6 rounded-xl bg-white dark:bg-gray-800 shadow dark:shadow-md animate-pulse">
                <h3 class="text-xl mb-4 text-gray-900 dark:text-gray-100">Loading...</h3>
                <div class="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            </div>
            <div class="p-6 rounded-xl bg-white dark:bg-gray-800 shadow dark:shadow-md animate-pulse">
                <h3 class="text-xl mb-4 text-gray-900 dark:text-gray-100">Loading...</h3>
                <div class="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            </div>
            <div class="p-6 rounded-xl bg-white dark:bg-gray-800 shadow dark:shadow-md animate-pulse">
                <h3 class="text-xl mb-4 text-gray-900 dark:text-gray-100">Loading...</h3>
                <div class="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
            </div>
        </div>
    `;	


    let cards = null;
    try {
        cards = await fetchData("assets/php/generate_index_cards.php", 0);
        if (cards && typeof cards === 'object' && Object.keys(cards).length > 0) {
            displayCards(cards);
        } else {
            console.error("No cards data received.");
        }
    } catch (Exception) {
        console.error(Exception);
    }
    return cards;
};

(function() {
    function displayCards(cards) {
        if (typeof cards === "string") {
            try {
                cards = JSON.parse(cards);
            } catch (error) {
                console.error("Failed to parse cards JSON:", error);
                return;
            }
        }
        const container = document.getElementById("randomCards");
        if (!container) return;

        const createCard = (title, content, link_href, picture_href) => `
            <a href="${link_href}" class="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg transition transform hover:scale-105 flex flex-col justify-around">
            <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">${title}</h2>
            <div class="flex items-center">
                <img src="${picture_href}" alt="${title}" class="w-20 h-20 object-contain rounded-xl mr-4">
                <div class="text-lg text-gray-700 dark:text-gray-300">
                ${content.replaceAll("_", " ")}
                </div>
                </div>
            </a>
        `;
        cards.driver.name = cards.driver.firstName + "_" + cards.driver.lastName;
        container.innerHTML = `
            ${createCard("Random Driver",
            cards.driver.name || "Unknown",
            "driver.html?id=" + cards.driver.name,
            cards.driver.picture || "drivers/picture/default.png"
        )
            }
            ${createCard("Random Team",
                cards.team.name || "Unknown",
                "team.html?id=" + cards.team.name,
                cards.team.picture || "teams/picture/default.png"
            )
            }
            ${createCard("Random Championship",
                cards.championship.name || "Unknown",
                "race.html?id=" + cards.championship.name + "&year=" + cards.championship.year,
                cards.championship.picture || "races/picture/default.png"
            )
            }
        `;
        return cards;
    }

    // Expose the function only within this file
    window.displayCards = displayCards;
})();