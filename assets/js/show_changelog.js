document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("commitsContainer");

    try {
        const response = await fetch("changelog.json");
        if (!response.ok) throw new Error("Unable to load the changelog.");

        const data = await response.json();

        let allCommits = [];

        Object.entries(data).forEach(([categoryName, categoryData]) => {
            let categoryCommits = [];
            Object.entries(categoryData).forEach(([date, commitsByDate]) => {
                Object.entries(commitsByDate).forEach(([commitId, commitDetails]) => {
                    categoryCommits.push({
                        id: commitId,
                        date: date,
                        author: commitDetails.author,
                        message: commitDetails.commit_title,
                        fullMessage: commitDetails.commit_text
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
            container.innerHTML = "<p class='text-gray-500 dark:text-gray-400 text-center'>No recent commits.</p>";
            return;
        }

        container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${allCommits.length} gap-6">
            ${allCommits.map(category => `
                <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow-md hover:shadow-lg border-t-4 border-blue-500 dark:border-blue-400 transition">
                    <h2 class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 tracking-wide uppercase">${category.category}</h2>
                    ${category.commits.map(commit => `
                        <div class="bg-white dark:bg-gray-900 shadow-sm hover:shadow-md rounded-xl p-4 mb-4 border-l-4 border-blue-500 dark:border-blue-400 cursor-pointer group transition"
                            onclick="toggleMessage('${commit.id}')">
                            <p class="font-semibold text-lg text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                ${commit.message}
                            </p>
                            <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                By <span class="font-medium">${commit.author}</span> - ${new Date(commit.date).toLocaleDateString()}
                            </p>
                            <p id="msg-${commit.id}" class="text-gray-700 dark:text-gray-300 text-sm mt-3 max-h-0 overflow-hidden opacity-0 transform translate-y-4 transition-all duration-500 ease-in-out">
                                ${commit.fullMessage}
                            </p>
                        </div>
                    `).join("")}
                </div>
            `).join("")}
        </div>
        `;

    } catch (error) {
        console.error("Error loading commits:", error);
        container.innerHTML = "<p class='text-red-500 text-center'>Error loading commits.</p>";
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
