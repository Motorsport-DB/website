document.addEventListener("DOMContentLoaded", async () => {
    const searchBox = document.getElementById("searchBox");
    const searchResults = document.getElementById("searchResults");

    searchBox.addEventListener("input", async (e) => {
        const query = e.target.value.trim().toLowerCase();
        searchResults.innerHTML = "";

    if (query.length > 1) {
      const response = await fetch(`getMainPage.php?search=${query}`);
      const results = await response.json();
      results.forEach(item => {
        let div = document.createElement("div");
        div.className = "bg-gray-800 p-4 rounded-2xl flex items-center mb-2 shadow transition hover:scale-105";
        div.innerHTML = `
                  <img src="${item.image}" class="w-16 h-16 object-cover rounded-full mr-4 border-2 border-blue-400">
                  <div class="flex flex-col">
                      <a href="${item.url}" class="text-lg font-bold text-blue-400 hover:underline">${item.name}</a>
                  </div>
              `;
        searchResults.appendChild(div);
      });
    }
  });

    try{
        let cards = await fetchData("assets/php/generate_index_cards.php", 0);
        displayCards(cards);
    } catch (Exception) {
        console.error(Exception);
    }
});

function displayCards(cards) {
  const container = document.getElementById("randomCards");
  if (!container) return;

  const createCard = (title, content, link_href, picture_href) => `
      <div class="p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition transform hover:scale-105 flex flex-col justify-around">
          <h2 class="text-xl font-semibold mb-2 text-gray-800">${title}</h2>
          <div class="flex items-center">
              <img src="${picture_href}" alt="${title}" class="w-20 h-20 object-contain rounded-xl mr-4">
              <div>
                  <a class="text-lg text-gray-700 hover:text-blue-500 hover:underline" href="${link_href}">
                      ${content.replaceAll("_", " ")}
                  </a>
              </div>
          </div>
      </div>
  `;

    cards.driver.name = cards.driver.firstName + "_" + cards.driver.lastName;
    container.innerHTML = `
            ${createCard("Random Driver", 
                        cards.driver.name || "Unknown", 
                        "driver.html?id="+cards.driver.name,
                        cards.driver.picture || "drivers/picture/default.png"
                        )
            }
            ${createCard("Random Team",
                        cards.team.name || "Unknown",
                        "team.html?id="+cards.team.name,
                        cards.team.picture || "teams/picture/default.png"
                        )
            }
            ${createCard("Random Championship",
                        cards.championship.name || "Unknown",
                        "race.html?id="+cards.championship.name+"&year="+cards.championship.year,
                        cards.championship.picture || "races/picture/default.png"
                        )
            }
        `;
    loadStatsAndDrawChart(cards.statistics);
}

async function loadStatsAndDrawChart(stats) {
  const ctx = document.getElementById('statsDonut').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Drivers', 'Teams', 'Championships'],
      datasets: [{
        label: 'Website stats',
        data: [
          stats.numbers_of_drivers,
          stats.numbers_of_teams,
          stats.numbers_of_championship
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            color: "black",
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#ffffff",
          bodyColor: "#d1d5db",
          borderColor: "#3B82F6",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              const label = ctx.label || '';
              const value = ctx.raw || 0;
              return `${label}: ${value}`;
            }
          }
        }
      }
    }
  });
}
