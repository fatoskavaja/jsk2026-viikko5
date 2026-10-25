"use strict";

// Osiot d ja e: itse valittu Open-Meteo-rajapinta ja kaupunkikohtainen haku.
// Koordinaatit on määritelty valmiiksi, joten erillistä paikannusta ei tarvita.
const kaupungit = {
    vaasa: { nimi: "Vaasa", latitude: 63.096, longitude: 21.616 },
    helsinki: { nimi: "Helsinki", latitude: 60.1699, longitude: 24.9384 },
    tampere: { nimi: "Tampere", latitude: 61.4978, longitude: 23.761 }
};

const valinta = document.querySelector("#kaupunki");
const painike = document.querySelector("#hae-painike");
const tila = document.querySelector("#tila");
const tulos = document.querySelector("#tulos");

async function haeSaa() {
    // Ota valittu kaupunki talteen ennen asynkronisen haun alkua.
    const kaupunki = kaupungit[valinta.value];
    if (!kaupunki || painike.disabled) return;

    // Osio c: näkyvä lataustila ja rinnakkaisten hakujen estäminen.
    painike.disabled = true;
    valinta.disabled = true;
    tulos.setAttribute("aria-busy", "true");
    tulos.replaceChildren();
    tila.textContent = "Haetaan tietoa... " + kaupunki.nimi;

    const controller = new AbortController();
    const aikakatkaisu = setTimeout(() => controller.abort(), 12000);

    try {
        const osoite = new URL("https://api.open-meteo.com/v1/forecast");
        osoite.search = new URLSearchParams({
            latitude: kaupunki.latitude,
            longitude: kaupunki.longitude,
            current: "temperature_2m,wind_speed_10m",
            wind_speed_unit: "ms",
            timezone: "Europe/Helsinki"
        }).toString();

        // Osio a: fetch hakee JSON-dataa ulkoisesta avoimesta rajapinnasta.
        const vastaus = await fetch(osoite, { signal: controller.signal });
        // fetch ei itsessään ilmoita HTTP-virhekoodeista poikkeuksina.
        if (!vastaus.ok) throw new Error("HTTP-virhe " + vastaus.status);
        const data = await vastaus.json();
        console.log("Rajapinnan vastaus (" + kaupunki.nimi + "):", data);

        const saa = data.current;
        if (!saa || !Number.isFinite(saa.temperature_2m) ||
            !Number.isFinite(saa.wind_speed_10m) ||
            typeof saa.time !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(saa.time)) {
            throw new Error("Rajapinnan vastaus ei sisällä odotettuja säätietoja.");
        }

        // Osio b: luodaan HTML-elementit ja asetetaan arvot tekstinä.
        // Ulkoisesta palvelusta saatua dataa ei sijoiteta innerHTML:ään.
        const otsikko = document.createElement("h3");
        otsikko.textContent = kaupunki.nimi;
        const lampotila = document.createElement("p");
        lampotila.textContent = "Lämpötila: " + saa.temperature_2m.toLocaleString("fi-FI") + " °C";
        const tuuli = document.createElement("p");
        tuuli.textContent = "Tuulen nopeus: " + saa.wind_speed_10m.toLocaleString("fi-FI") + " m/s";
        const ajankohta = document.createElement("p");
        const [paiva, kellonaika] = saa.time.split("T");
        const [vuosi, kuukausi, pv] = paiva.split("-");
        ajankohta.textContent = "Tietojen ajankohta: " + pv + "." + kuukausi + "." + vuosi +
            " klo " + kellonaika + " (Suomen aika).";
        tulos.replaceChildren(otsikko, lampotila, tuuli, ajankohta);
        tila.textContent = "Säätiedot haettu: " + kaupunki.nimi + ".";
    } catch (virhe) {
        // Osio c: verkko-, HTTP-, JSON- ja sisältövirheet näkyvät käyttäjälle.
        console.error("Säähaun virhe:", virhe);
        tila.textContent = virhe.name === "AbortError"
            ? "Haku kesti liian kauan. Yritä uudelleen."
            : "Säätietojen haku epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.";
    } finally {
        clearTimeout(aikakatkaisu);
        painike.disabled = false;
        valinta.disabled = false;
        tulos.setAttribute("aria-busy", "false");
    }
}

painike.addEventListener("click", haeSaa);
