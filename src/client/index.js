
const state = null;

class FlashcardManager {
        async fetchFlashcards() {
                try {
                        const headers = new Headers();
                        headers.append("Content-Type", "application/json");
                        const response = await fetch('/api/getAllFlashcards', {
                                method: "POST",
                                body: JSON.stringify({
                                        spreadsheet_id: "1w8JKb4kko-PIX0y8kBsMr7Kor9KGNFsYKkR6-iNQ3xc",
                                        sheet: 0,
                                }),
                                headers: headers,
                        });
                        if (!response.ok) throw new Error(`My HTTP error! ${response.status}`);
                        const data = await response.json();
                        if (data.error) throw new Error(`My HTTP error2: ${ data.error }`)

                        console.log(data);
                } catch (error) {

                }
        }
}

async function initializeApp() {
        const manager = new FlashcardManager();
        await manager.fetchFlashcards();
};

window.addEventListener('load', initializeApp);