document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("commitsContainer");

    try {
        const response = await fetch("changelog.json");
        if (!response.ok) throw new Error("Impossible de charger le changelog.");

        const data = await response.json();

        let allCommits = [];


        Object.entries(data).forEach(([categoryName, categoryData]) => {
            let categoryCommits = [];
            Object.entries(categoryData).forEach(([date, commitsByDate]) => {
                Object.entries(commitsByDate).forEach(([commitId, commitDetails]) => {
                    categoryCommits.push({
                        id: commitId,
                        date: date,
                        author: commitDetails.auteur,
                        message: commitDetails.titre_commit,
                        fullMessage: commitDetails.texte_commit
                    });
                });
            });


            categoryCommits.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (categoryCommits.length > 0) {
                allCommits.push({
                    category: categoryName,
                    commits: categoryCommits
                });
            }
        });
        if (allCommits.length === 0) {
            container.innerHTML = "<p class='text-gray-500 text-center'>Aucun commit récent.</p>";
            return;
        }


        container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${allCommits.length} gap-6">
            ${allCommits.map(category => `
                <div class="bg-gray-100 p-4 rounded-lg shadow border-t-4 border-blue-500">
                    <h2 class="text-xl font-bold text-blue-600 mb-4">${category.category.toUpperCase()}</h2>
                    ${category.commits.map(commit => `
                        <div class="bg-white shadow-md rounded-lg p-4 mb-4 border-l-4 border-blue-500 cursor-pointer hover:bg-blue-50 transition"
                            onclick="toggleMessage('${commit.id}')">
                            <p class="font-semibold text-mg text-gray-900">${commit.message}</p>
                            <p class="text-gray-600 text-sm">
                                Par <span class="font-medium">${commit.author}</span> - ${new Date(commit.date).toLocaleDateString()}
                            </p>
                            <p id="msg-${commit.id}" class="text-gray-700 text-sm mt-2 max-h-0 overflow-hidden opacity-0 transform translate-y-4 transition-all duration-500 ease-in-out">
                                ${commit.fullMessage}
                            </p>
                        </div>
                    `).join("")}
                </div>
            `).join("")}
        </div>
    `;

    } catch (error) {
        console.error("Erreur lors du chargement des commits :", error);
        container.innerHTML = "<p class='text-red-500 text-center'>Erreur lors du chargement des commits.</p>";
    }
});

function toggleMessage(commitId) {
    const messageElement = document.getElementById(`msg-${commitId}`);

    if (messageElement.classList.contains('opacity-0')) {
        messageElement.classList.remove('opacity-0', 'max-h-0', 'translate-y-4');
        messageElement.classList.add('opacity-100', 'max-h-96', 'translate-y-0');
    } else {
        messageElement.classList.remove('opacity-100', 'max-h-96', 'translate-y-0');
        messageElement.classList.add('opacity-0', 'max-h-0', 'translate-y-4');
    }
}
