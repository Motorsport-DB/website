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
