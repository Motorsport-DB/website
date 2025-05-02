let link = {};

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

async function create_links(BALISE) {
    for (let i = 0; i < BALISE.length; i++) {
        PAGE = BALISE[i].href.split(".")[0].split("/").pop();
        if (!BALISE[i].href.includes("?")) {
            continue;
        }
        try {
            PARAMS = BALISE[i].href.split("?")[1].split("&").map(param => param.split("=")[1]);
        } catch (error) {
            console.error('Error parsing parameters:', error);
        }


        if (PARAMS.length === 0) {
            continue;
        }

        let img_link = null;
        switch (PAGE) {
            case "index":
                continue;
            default:
                let folder = PAGE+"s"; // Just add "s" to the page name
                if (!link[PARAMS[0]]) {
                    img_link = await get_picture(folder, PARAMS[0]);
                    link[PARAMS[0]] = img_link;
                } else {
                    img_link = link[PARAMS[0]];
                }
                break;
        }

        let tooltip = `
        <!-- Tooltip image -->
        <div class="absolute bottom-full mx-auto mb-2 w-48 h-48 
            max-w-xs bg-white dark:bg-gray-800 border border-gray-300 
            dark:border-gray-600 shadow-xl rounded-lg overflow-hidden 
            opacity-0 group-hover:opacity-100 transition-opacity duration-300 
            pointer-events-none z-50">
            <img src="${img_link}" alt="Team logo" class="w-full h-full object-contain" />
        </div>
        `;

        if (BALISE[i].parentElement) {
            BALISE[i].parentElement.insertAdjacentHTML('beforeend', tooltip);
        }
    }
}