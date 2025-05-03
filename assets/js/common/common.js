async function get_picture(FOLDER, ID) {
    try {
        const response = await fetch(`assets/php/get_picture.php?folder=${FOLDER}&id=${ID}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.imagePath || null;
    } catch (error) {
        console.error('Error fetching picture:', error);
        return null;
    }
}
async function fetchData(endpoint, id, year = null) {
    try {
        const response = await fetch(`${endpoint}?id=${id}${year ? `&year=${year}` : ""}`);
        return await response.json();
    } catch (Exception) {
        console.error(Exception);
        const text = await response?.text();
        console.warn(text);
        return {};
    }
}

function getAge(birthDate, deathDate) {
    try {
        const birth = new Date(birthDate);
        const death = deathDate ? new Date(deathDate) : new Date();
        return death.getFullYear() - birth.getFullYear();
    } catch (Exception) {
        const end = deathDate ? end : new Date().getFullYear();
        return parseInt(birthDate) - parseInt(end);
    }
}

function toggleDetails(rowId) {
    const detailsSpan = document.getElementById(rowId);
    detailsSpan.classList.toggle("hidden");
}

function displayFlagImage(country) {
    if (!country) return "assets/flags/default.png";
    return `assets/flags/${country.toLowerCase().replace(/ /g, "_")}.png`;
}

async function create_links(elements) {
    const cache = {};

    for (const element of elements) {
        const href = element.href;
        if (!href.includes("?")) continue;

        const [page, query] = href.split("?").map((part, index) => index === 0 ? part.split("/").pop().split(".")[0] : part);
        if (!query) continue;

        const params = query.split("&").map(param => param.split("=")[1]);
        if (params.length === 0) continue;

        if (page === "index") continue;

        const folder = `${page}s`;
        const id = params[0];

        if (!cache[id]) {
            try {
                cache[id] = await get_picture(folder, id);
            } catch (error) {
                console.error(`Error fetching image for ID ${id}:`, error);
                continue;
            }
        }

        const imgLink = cache[id];
        if (!imgLink) continue;

        const tooltip = `
            <div class="absolute bottom-full mx-auto mb-2 w-48 h-48 
                max-w-xs bg-white dark:bg-gray-800 border border-gray-300 
                dark:border-gray-600 shadow-xl rounded-lg overflow-hidden 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                pointer-events-none z-50">
                <img src="${imgLink}" alt="Team logo" class="w-full h-full object-contain" />
            </div>
        `;

        element.parentElement?.insertAdjacentHTML('beforeend', tooltip);
    }
}
