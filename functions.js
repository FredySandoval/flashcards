const { google } = require('googleapis');
const axios = require('axios');
const cheerio = require('cheerio');
/**
 * Cleans a word by trimming spaces and removing leading definite articles (der, die, das).
 * If the input word is not a string or is empty after trimming, returns an empty string.
 * @param {string} word - The word to be cleaned.
 * @returns {string} The cleaned word with leading articles removed.
 * @example hell
 */
function cleanWord(word) {
    if (typeof word !== 'string' || word.trim() === '') {
        return ''; // Return empty string for invalid input
    }
    // Trim spaces first and then remove leading articles (der, die, das)
    return word.trim().replace(/^(der|die|das)\s+/i, '').trim();
}

/**
 * Extracts audio examples for a given word from the German Wiktionary (de.wiktionary.org).
 * internally uses axios and cheerio to work
 * @param {string} word - The word to search for audio examples.
 * @returns {Promise<Array<{ url: string, text: string }>>} - A promise that resolves to an array of objects,
 * each containing the URL linking to the pronunciations of the word and a text that is the word itself being pronounced.
 * If no audio examples are found or an error occurs, an empty array is returned.
 * @example of return [{url:'https://upload.wikimedia.org/wikipedia/hallo.ogg', text: 'hallo' }]
 */
async function extractAudioExamplesOfWord(word) {
    if (typeof word !== 'string' || word.trim() === '') {
        console.log('Invalid input: word must be a non-empty string');
        return []; // Return empty array instead of throwing an error
    }

    const cleanedWord = cleanWord(word);
    const url = `https://de.wiktionary.org/wiki/${encodeURIComponent(cleanedWord)}`;

    try {
        const response = await axios.get(url);
        if (response.status !== 200 ) return [];
        const $ = cheerio.load(response.data);

        const audioExamples = [];

        $('dd').each((index, element) => {
            const ddText = $(element).text();
            if (ddText.includes('Hörbeispiele:')) {
                $(element).find('a.internal').each((i, audioLink) => {
                    const audioUrl = $(audioLink).attr('href');
                    const audioText = $(audioLink).text();
                    if (audioUrl && 
                        audioUrl.includes('.ogg') ||
                        audioUrl.includes('.oga') ||
                        audioUrl.includes('.mp3')
                        ) {
                        audioExamples.push({
                            url: audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl,
                            text: audioText
                        });
                    }
                });
            }
        });

        return audioExamples;
    } catch (error) {
        console.error(`Error processing '${cleanedWord}':`, error.message);
        return []; // Return empty array instead of throwing an error
    }
}
/**
* Accesses a Google Sheets spreadsheet to retrieve values within a specified range.
* 
* @returns {Promise<Array<Array<string>>>} - A Promise that resolves with the values retrieved from the spreadsheet.
* @throws {Error} - If there is an issue accessing the Google Sheets API or retrieving values.
*/
async function accessSpreadsheet(spreadsheetId, auth, range) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });
        // const spreadsheetId = '1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc'; // Replace with your Google Sheet ID
        // const range = 'Sheet1!A1:D'; // Replace with your sheet name and range

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        // return response.data.values;
        return response;
    } catch (err) {
        console.error('The API returned an error:', err);
        return null;
    }
}

/**
* Insert value in specified cell in Google Sheets spreadsheet.
* Updates the corresponding cell,
* and handles errors if any occur during the process.

*/
/**
 * Inserts values into a specific cell or range in a Google Sheets spreadsheet.
 * 
 * @async
 * @function
 * @param {string} spreadsheetId - The ID of the Google Sheets spreadsheet.
 * @param {object} auth - The authentication object for Google Sheets API.
 * @param {string} range - The A1 notation of the values to update.
 * @param {Array<Array<string|number|boolean>>} values - The values to be inserted into the cell or range.
 * @returns {Promise<object>} - The response from the Google Sheets API.
 * @throws {Error} If the API call returns an error.
 * @example 
 * // for range "Sheet1!A1:D5"
 *  const values = [
    ["Item", "Cost", "Stocked", "Ship Date"],
    ["Wheel", "$20.50", "4", "3/1/2016"],
    ["Door", "$15", "2", "3/15/2016"],
    ["Engine", "$100", "1", "30/20/2016"],
    ["Totals", "$135.5", "7", "3/20/2016"]
  ],
 * 
 */
async function insertValueInCell(spreadsheetId, auth, range, values) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: values
            }
        });
        return response;
    } catch (err) {
        console.error('At function insertValueInCell(), The API returned an error while trying:', err);
    }
}
// Helper function for delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function checkAndAddAudioForAllRows(spreadsheetId, auth, rawData) {
    const data = rawData.data.values;
    const audioColumnIndex = 3; // Assuming audio URLs are in column D (index 3)
    const wordColumnIndex = 0;  // Assuming words are in column A (index 0)

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        const audioCell = row[audioColumnIndex];
        const word = row[wordColumnIndex];
        

        if (audioCell === undefined && word !== undefined && word !== '' ) {
            try {
                const audioExamples = await extractAudioExamplesOfWord(word);
                console.log(audioExamples);

                const urls = audioExamples.map(item => item.url).join(', ');

                // Adding 1 to rowIndex because spreadsheet rows are 1-indexed
                await insertValueInCell(
                    spreadsheetId,
                    auth,
                    `Sheet1!D${rowIndex + 1}:E${rowIndex + 1}`, // example: Sheet!D1:E1
                    [[urls]] //  single value [['https://..']]
                );

                console.log(`Added audio for word: ${word}`);
            } catch (error) {
                console.error(`Error adding audio for word: ${word}`, error);
            }
        }
        // Introduce a delay of 100 milliseconds between iterations
        await delay(100);
    }
}
module.exports = { cleanWord, extractAudioExamplesOfWord, insertValueInCell, accessSpreadsheet, checkAndAddAudioForAllRows };