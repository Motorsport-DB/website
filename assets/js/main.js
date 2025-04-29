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
              div.className = "bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl flex items-center mb-2 shadow transition hover:scale-105";
              div.innerHTML = `
                  <img src="${item.image}" class="w-16 h-16 object-contain rounded-full mr-4 border-2 border-blue-400">
                  <div class="flex flex-col">
                      <a href="${item.url}" class="text-lg font-bold text-gray-800 dark:text-blue-400 hover:underline">${item.name}</a>
                  </div>
              `;
              searchResults.appendChild(div);
          });
      }
  });
  let cards = await generate_random_cards();
    if (!cards) console.error("No cards found.");
  loadStatsAndDrawChart(cards.statistics);
});



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
