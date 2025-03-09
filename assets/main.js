document.addEventListener("DOMContentLoaded", () => {
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
                div.className = "bg-gray-800 p-4 rounded-lg flex items-center";
                div.innerHTML = `
                    <img src="${item.image}" class="w-16 h-16 object-cover rounded-lg mr-4">
                    <a href="${item.url}" class="text-lg font-bold text-blue-400">${item.name}</a>
                `;
                searchResults.appendChild(div);
            });
        }
    });
});