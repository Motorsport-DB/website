async function fetchData(endpoint, id, year = null) {
    const response = await fetch(`${endpoint}?id=${id}${year ? `&year=${year}` : ""}`);
    return response.json();
}

function getAge(birthDate, deathDate) {
    const birth = new Date(birthDate);
    const death = deathDate ? new Date(deathDate) : new Date();
    return death.getFullYear() - birth.getFullYear();
}

function toggleDetails(rowId) {
    const detailsSpan = document.getElementById(rowId);
    detailsSpan.classList.toggle("hidden");
}

function displayFlagImage(country) {
    if (!country) return "assets/flags/default.png";
    return `assets/flags/${country.toLowerCase().replace(/ /g, "_")}.png`;
}
