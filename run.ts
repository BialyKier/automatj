import { chromium, Locator } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';



interface SiteRecord {
    url: string;
    login: string;
    password: string;
    category?: string;
}

const pagesAfterE1 : SiteRecord[] = [];
const pagesAfterE2 : SiteRecord[] = [];


async function run() {

    const h1TitleFirst = 'Blog';
    const h1TitleSecond = 'Artykuły blogowe';

    const postTitle = 'Witaj w blogu!';
    const postExcerpt = 'Został on stworzony, żeby przybliżyć niniejszą działalność. ';
    const postContent = 'Znajdziesz tu różne artykuły przedstawiające oferowane produkty oraz świadczone usługi. Miłej lektury!';

    const obrazekwyrozniajacy = 'a-blog-photo-test.jpg';
    
    let udane_e1 = 0;
    let nieudane_e1 = 0;
    let udane_e2 = 0;
    let nieudane_e2 = 0;

    let successAlert: Locator;
    let errorAlert: Locator;
    
    const timeout = 20000;
    const defaulttimeout = 50000;
    
    // 1. Wczytanie pliku CSV
    const csvData = fs.readFileSync('strony.csv', 'utf-8');
    const sites: SiteRecord[] = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
    
    // Czyszczenie / przygotowanie świeżych plików raportu przed startem
    fs.writeFileSync('sukces_e1.txt', `--- RAPORT Z URUCHOMIENIA (${new Date().toLocaleString()}) ---\n`);
    fs.writeFileSync('bledy_e1.txt', `--- RAPORT BŁĘDÓW (${new Date().toLocaleString()}) ---\n`);
    fs.writeFileSync('sukces_e2.txt', `--- RAPORT Z URUCHOMIENIA (${new Date().toLocaleString()}) ---\n`);
    fs.writeFileSync('bledy_e2.txt', `--- RAPORT BŁĘDÓW (${new Date().toLocaleString()}) ---\n`);
    
    // headless: false pozwala podejrzeć działanie; zmień na true przy nocnym wsadzie
    const browser = await chromium.launch({ headless: false, slowMo:200 });

    
    // ### ETAP 1 - Dodawanie kategorii ##########################
    console.log(`\n================ ROZPOCZYNAM ETAP 1.0 - DODAWANIE KATEGORII ================\n\n`);
    console.log(`[ETAP 1.0]: Załadowano ${sites.length} stron do przetworzenia.\n`);
    
    for (let i = 0; i < sites.length; i++) {

        let h1Title = h1TitleFirst;

        const site = sites[i];
        const nr = i + 1;
        const originUrl = new URL(site.url).origin; // Wyciągamy samą domenę (protokół + host), aby uniknąć problemów z przekierowaniami
        
        console.log(`[ETAP 1]: [${i+1}/${sites.length}] Start: ${originUrl}`);
        
        // Izolowany kontekst na każdą domenę - czy-ste ciasteczka, brak wycieków pamięci
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Twardy limit 12 sekund na pojedynczą akcję (jeśli serwer muli, lecimy dalej)
        page.setDefaultTimeout(defaulttimeout);
        
        // Definicja alertów
        successAlert = page.locator('joomla-alert[type="success"]');
        errorAlert = page.locator('joomla-alert[type="danger"]');
        
        try {// ### AUTORYZACJA
            
            try{// KROK 1.1: Przejście pod adres panelu logowania
                console.log(`[ETAP 1.1]: [${i+1}/${sites.length}] Przejście pod adres panelu logowania`);

                await page.goto(site.url, { waitUntil: 'load' });

                console.log(`[ETAP 1.1]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.1]: [${nr}/${sites.length}] Krok 1.1: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            try{// KROK 1.2: Logowanie do panelu CMS
                console.log(`[ETAP 1.2]: [${i+1}/${sites.length}] Logowanie do panelu CMS`);

                await page.getByRole('textbox', { name: 'Użytkownik' }).fill(site.login);
                await page.getByRole('textbox', { name: 'Hasło' }).fill(site.password);
                await page.getByRole('button', { name: 'Zaloguj' }).click();

                console.log(`[ETAP 1.2]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.2]: [${nr}/${sites.length}] Krok 1.2: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            try{// KROK 1.3: Weryfikacja logowania
                console.log(`[ETAP 1.3]: [${i+1}/${sites.length}] Weryfikacja logowania`);

                await page.getByRole('textbox', { name: 'Hasło' }).waitFor({ state: 'detached', timeout: timeout });

                console.log(`[ETAP 1.3]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.3]: [${nr}/${sites.length}] Krok 1.3: ${mediaErr.message.split('\n')[0]} - Błąd`);} 
            
            // ### TWORZENIE KATEGORII
        
            try{// KROK 1.4: Wejście w link panelu tworzenia kategorii
                console.log(`[ETAP 1.4]: [${i+1}/${sites.length}] Tworzenie kategorii`);
                
                await page.goto(`${originUrl}/administrator/index.php?option=com_categories&view=category&layout=edit&extension=com_content`, { waitUntil: 'load' });

                console.log(`[ETAP 1.4]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.4]: [${nr}/${sites.length}] Krok 1.4: ${mediaErr.message.split('\n')[0]} - Błąd`);}


            try{// KROK 1.5: Wpisanie nazwy kategorii
                console.log(`[ETAP 1.5]: [${i+1}/${sites.length}] Tworzenie kategorii`);
                
                await page.getByRole('textbox', { name: 'Tytuł' }).fill(h1Title);

                console.log(`[ETAP 1.5]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.5]: [${nr}/${sites.length}] Krok 1.5: ${mediaErr.message.split('\n')[0]} - Błąd`);}


            try{// Krok 1.6: Zapis kategorii, weryfikacja zapisu oraz alternatywna kategoria
            console.log(`[ETAP 1.5]: [${i+1}/${sites.length}] Tworzenie kategorii alternatywnej`);

            await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
            await Promise.race([
                successAlert.first().waitFor({ state: 'visible', timeout: timeout }),
                errorAlert.first().waitFor({ state: 'visible', timeout: timeout })
            ]);
            
            if(await errorAlert.first().isVisible()) {
                h1Title = h1TitleSecond;
                await page.getByRole('textbox', { name: 'Tytuł' }).fill(h1Title);
                if(await page.getByRole('textbox', { name: 'Alias' }).isVisible()) {
                    await page.getByRole('textbox', { name: 'Alias' }).fill('');
                }
                
                await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
                
                await Promise.race([
                    successAlert.first().waitFor({ state: 'visible', timeout: timeout }),
                    errorAlert.first().waitFor({ state: 'visible', timeout: timeout })
                ]);
                
                if(await errorAlert.first().isVisible()) {
                    
                    const trescBledy = await errorAlert.first().locator('.alert-message').innerText();
                    throw new Error(`Błąd przy dodawaniu kategorii: ${trescBledy}`);
                }
            }
            
            console.log(`[ETAP 1.1]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.6]: [${nr}/${sites.length}] Krok 1.6: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            // ### MODYFIKACJA KATEGORII

            try{// Krok 1.7: Modyfikacja kategorii <h1>
            console.log(`[ETAP 1.7]: [${i+1}/${sites.length}] Modyfikacja kategorii`);
            
            const tabKategoria = page.getByRole('tab', { name: 'Kategoria' });
            if(await tabKategoria.isVisible()) {
                await tabKategoria.click();
                const kolumna12 = page.getByText('kolumna -12');
                if((await kolumna12.count()) > 0){
                    await kolumna12.click();
                    
                    const blokTresc = page.getByText('Treść', {exact: true}).last();
                    await blokTresc.waitFor({ state: 'visible', timeout: timeout });
                    await blokTresc.click();
                    
                    await page.getByRole('menuitem', { name: 'Narzędzia' }).click();
                    await page.getByText('Kod źródłowy').click();
                    
                    const oknoKodu = page.getByRole('dialog', { name: 'Kod źródłowy' });
                    await oknoKodu.waitFor({ state: 'visible', timeout: timeout });
                    
                    await oknoKodu.locator('textarea').fill(`<h1>${h1Title}</h1>`);
                    
                    await oknoKodu.getByRole('button', { name: 'Zapisz' }).click();
                    
                    await oknoKodu.waitFor({ state: 'hidden', timeout: timeout });
                    
                    console.log(`[ETAP 1]: [${i+1}/${sites.length}] Dodano nagłówek <h1> do kategorii`);
                
                }
            }

            console.log(`[ETAP 1.7]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.7]: [${nr}/${sites.length}] Krok 1.7: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            try{// Krok 1.8: Wybór Layout2 jeśli jest dostępny w szablonie. Jeśli nie ma, po prostu kontynuuj
            console.log(`[ETAP 1.8]: [${i+1}/${sites.length}] Wybór alternatywnego układu`);
            
            const tabOpcje = page.getByRole('tab', { name: 'Opcje' });
            
            if(await tabOpcje.isVisible()) {
                await tabOpcje.click();
                const selectUklad = page.getByLabel('Alternatywny układ');
                if( await selectUklad.isVisible()) {
                    const maOpcje = (await selectUklad.locator('option[value="site:layout2"]').count()) > 0;
                    
                    if(maOpcje) {
                        await selectUklad.selectOption('site:layout2');
                        console.log(`[ETAP 1]: [${i+1}/${sites.length}] Zmieniono alternatywny układ na "site:layout2"`);
                    } else {
                        console.log(`[ETAP 1]: [${i+1}/${sites.length}] Opcja "site:layout2" nie jest dostępna w tym szablonie, pomijanie zmiany układu`);
                    }
                }
            }
            
            await page.getByRole('button', { name: 'Zapisz i zamknij' }).click();
            
            await Promise.race([
                successAlert.first().waitFor({ state: 'visible', timeout: timeout }),
                errorAlert.first().waitFor({ state: 'visible', timeout: timeout })
            ]);
            
            if(await errorAlert.first().isVisible()) {
                const trescBledy = await errorAlert.first().locator('.alert-message').innerText();
                throw new Error(`Błąd przy dodawaniu kategorii: ${trescBledy}`);
            }
            
            console.log(`[ETAP 1.8]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 1.8]: [${nr}/${sites.length}] Krok 1.8: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            site.category = h1Title; // Zapisanie nazwy kategorii w obiekcie site, aby użyć jej w ETAP 2
            pagesAfterE1.push(site);
            
            udane_e1++;
            fs.appendFileSync('sukces_e1.txt', `${originUrl} Sukces\n`);
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] ETAP 1 ZAKOŃCZONY SUKCESEM: ${originUrl}.\n`);
        
        } catch (err: any) {
            nieudane_e1++;
            const error_reason = err.name === 'TimeoutError' ? 'Przekroczono czas (Timeout serwera)' : err.message.split('\n')[0];
            console.warn(`[ETAP 1]: [${i+1}/${sites.length}] Pomijam stronę. Powód: ${error_reason}`);
            fs.appendFileSync('bledy_e1.txt', `${originUrl} [Etap 1 Kategoria]: ${error_reason}\n`);
            console.warn(`[ETAP 1]: [${i+1}/${sites.length}] POMINIĘTO: ${originUrl}.\n`);
        } finally {
            await context.close();
        }
    }
    


    

// ### ETAP 2 - Dodawanie wpisu ##########################
console.log(`\n================ ROZPOCZYNAM ETAP 2.0 - DODAWANIE WPISU ================\n\n`);
console.log(`ETAP 2.0: Załadowano ${pagesAfterE1.length} stron do przetworzenia.\n`);

let nr = 0;
for(const site of pagesAfterE1) {
    nr++;
    const originUrl = new URL(site.url).origin;
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(defaulttimeout);
    successAlert = page.locator('joomla-alert[type="success"]');
    errorAlert = page.locator('joomla-alert[type="danger"]');

    try {// ### AUTORYZACJA
            console.log(`[ETAP 2.1]: [${nr}/${pagesAfterE1.length}] Logowanie do panelu: ${originUrl}`);

            try{// KROK 2.1: Przejście pod adres panelu logowania
                console.log(`[ETAP 2.1]: [${nr}/${pagesAfterE1.length}] Przejście pod adres panelu logowania`);

                await page.goto(site.url, { waitUntil: 'load' });
                
                console.log(`[ETAP 2.1]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.1]: [${nr}/${pagesAfterE1.length}] Krok 2.1: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            try{// KROK 2.2: Logowanie do panelu CMS
                console.log(`[ETAP 2.2]: [${nr}/${pagesAfterE1.length}] Logowanie do panelu CMS`);

                await page.getByRole('textbox', { name: 'Użytkownik' }).fill(site.login);
                await page.getByRole('textbox', { name: 'Hasło' }).fill(site.password);
                await page.getByRole('button', { name: 'Zaloguj' }).click();

                console.log(`[ETAP 2.2]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.2]: [${nr}/${pagesAfterE1.length}] Krok 2.2: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            try{// KROK 2.3: Weryfikacja logowania
                console.log(`[ETAP 2.3]: [${nr}/${pagesAfterE1.length}] Weryfikacja logowania`);

                await page.getByRole('textbox', { name: 'Hasło' }).waitFor({ state: 'detached', timeout: timeout });

                console.log(`[ETAP 2.3]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.3]: [${nr}/${pagesAfterE1.length}] Krok 2.3: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            // ### TWORZENIE NOWEGO WPISU
            console.log(`[ETAP 2.4]: [${nr}/${pagesAfterE1.length}] Tworzenie nowego wpisu: ${originUrl}`);

            try{// KROK 2.4: Przejście pod adres panelu kategorii
                console.log(`[ETAP 2.4]: [${nr}/${pagesAfterE1.length}] Przejście pod adres panelu kategorii`);

                await page.goto(`${originUrl}/administrator/index.php?option=com_content&view=article&layout=edit`, { waitUntil: 'load' });

                console.log(`[ETAP 2.4]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.4]: [${nr}/${pagesAfterE1.length}] Krok 2.4: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            try{// KROK 2.5: Wpisanie tytułu wpisu
                console.log(`[ETAP 2.5]: [${nr}/${pagesAfterE1.length}] Wpisanie tytułu wpisu`);

                await page.getByRole('textbox', { name: 'Tytuł' }).fill(postTitle);

                console.log(`[ETAP 2.5]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.5]: [${nr}/${pagesAfterE1.length}] Krok 2.5: ${mediaErr.message.split('\n')[0]} - Błąd`);}
 
            try{// KROK 2.6: Wybór kategorii wpisu: ${site.category}
                console.log(`[ETAP 2.6]: [${nr}/${pagesAfterE1.length}] Wybór kategorii wpisu: ${site.category}`);
                
                await page.locator('joomla-field-fancy-select').first().click();
                await page.getByRole('option', { name: site.category, exact: true }).click();

                console.log(`[ETAP 2.6]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.6]: [${nr}/${pagesAfterE1.length}] Krok 2.6: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            try{// KROK 2.7 Ustawienie SEO robots - noindex, nofollow
                console.log(`[ETAP 2.7]: [${nr}/${pagesAfterE1.length}] Ustawienie SEO robots - noindex, nofollow`);

                const metaDaneButton = page.getByRole('button',{name: 'Meta dane'});
                if(await metaDaneButton.isVisible({timeout:timeout}).catch(() => false)){ await metaDaneButton.click();}

                const selectRobots = page.locator('select').filter({hasText: /noindex/i }).first();
                await selectRobots.selectOption({ label: 'noindex, nofollow'}, {force:true});
                await selectRobots.dispatchEvent('change');

                console.log(`[ETAP 2.7]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) { console.warn(`[ETAP 2.7]: [${nr}/${pagesAfterE1.length}] Krok 2.7: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            
            try{// KROK 2.8: Dodanie treści wpisu - zajawka, czytaj więcej, treść
                console.log(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Dodanie treści wpisu - zajawka, czytaj więcej, treść`);
                
                // Excerpt
                console.log(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Dodanie treści wpisu - zajawka`);

                const kolumna12 = page.getByText('kolumna -12').first();
                
                if (await kolumna12.isVisible({ timeout }).catch(() => false)) {
                    await kolumna12.click();

                    await page.locator('div').filter({ hasText: /^Treść$/ }).first().click();
                    await page.getByRole('menuitem', { name: 'Narzędzia' }).click();
                    await page.getByText('Kod źródłowy').click();

                    const oknoKodu = page.getByRole('dialog', { name: 'Kod źródłowy' });
                    await oknoKodu.waitFor({ state: 'visible', timeout });
                    await oknoKodu.locator('textarea').fill(`<p>${postExcerpt}</p>`);
                    await oknoKodu.getByRole('button', { name: 'Zapisz' }).click();
                    await oknoKodu.waitFor({ state: 'hidden', timeout });
                }
                
                // Read more
                console.log(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Dodanie treści wpisu - czytaj więcej`);

                const readMoreBtn = page.getByText('Czytaj więcej', { exact: true });
                if (await readMoreBtn.isVisible({ timeout: timeout }).catch(() => false)) { await readMoreBtn.click(); }
                
                // Content
                console.log(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Dodanie treści wpisu - treść`);

                const kolumna12_2 = page.getByText('kolumna -12').last();
                
                if (await kolumna12_2.isVisible({ timeout }).catch(() => false)) {
                    await kolumna12_2.click();

                    await page.locator('div').filter({ hasText: /^Treść$/ }).last().click();
                    await page.getByRole('menuitem', { name: 'Narzędzia' }).last().click();
                    await page.getByText('Kod źródłowy').last().click();

                    const oknoKodu_2 = page.getByRole('dialog', { name: 'Kod źródłowy' }).last();
                    await oknoKodu_2.waitFor({ state: 'visible', timeout });
                    await oknoKodu_2.locator('textarea').fill(`<p>${postContent}</p>`);
                    await oknoKodu_2.getByRole('button', { name: 'Zapisz' }).last().click();
                    await oknoKodu_2.waitFor({ state: 'hidden', timeout });
                }

                console.log(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Sukces`);
            } catch (mediaErr: any) {console.warn(`[ETAP 2.8]: [${nr}/${pagesAfterE1.length}] Krok 2.8: ${mediaErr.message.split('\n')[0]} - Błąd`);}
            
            
            try{// KROK 2.9: Dodanie treści wpisu - obraz
                console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Dodanie treści wpisu - obraz`);

                console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Przejście do formularza wyboru - obraz`);

                const tabObrazki = page.getByRole('tab', { name: /Obrazki i łącza/i });
                await tabObrazki.waitFor({ state: 'visible', timeout });
                await tabObrazki.click();
                
                const btnWybierz = page.getByRole('button', { name: 'Wybierz' }).first();
                await btnWybierz.waitFor({ state: 'visible', timeout });
                await btnWybierz.click();
                
                // Stabilny locator do iframe mediów Joomla
                const mediaFrame = page.frameLocator('iframe[src*="com_media"]');
                
                // Czekamy chwilę, aż zawartość iframe się załaduje
                console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Oczekiwanie: stabilizacja iframe 4s`);
                await page.waitForTimeout(4000);
                
                // Wgrywanie pliku
                console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Wgrywanie pliku - obraz`);

                const localImagePath = path.resolve(obrazekwyrozniajacy); // adres obrazka wyróżniającego
                const imageName = path.basename(localImagePath);
                const kafelekZdjecia = mediaFrame.getByText(imageName, { exact: true }).first();
                
                if (await kafelekZdjecia.isVisible({ timeout: timeout }).catch(() => false)) {
                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Plik "${imageName}" już jest na liście.`);
                } else {
                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Wgrywanie pliku - obraz: ${imageName}`);
                    
                    // Bezpieczne wgranie pliku do inputa file wewnątrz iframe
                    const fileInput = mediaFrame.locator('input[type="file"]').first();
                    if (await fileInput.count() > 0) {
                        await fileInput.setInputFiles(localImagePath);
                        await page.waitForTimeout(timeout); // Dajemy chwilę na transfer pliku
                        }
                    }
                    
                    // Wybór wgranego zdjęcia i zatwierdzenie
                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Wgrywanie pliku obraz - ustawianie: ${imageName}`);
                    await kafelekZdjecia.waitFor({ state: 'visible', timeout });
                    await kafelekZdjecia.click();
                    
                    // Krótka pauza na ustabilizowanie się interfejsu po zaznaczeniu zdjęcia
                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Oczekiwanie: stabilizacja interfejsu 4s`);
                    await page.waitForTimeout(4000);

                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Wgrywanie pliku obraz - zatwierdzanie: ${imageName}`);
                    
                    await kafelekZdjecia.click();
                    await page.getByRole('dialog').getByRole('button', { name: 'Wybierz' }).click();

                    console.log(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Sukces`);
                } catch (mediaErr: any) {console.warn(`[ETAP 2.9]: [${nr}/${pagesAfterE1.length}] Krok 2.9: ${mediaErr.message.split('\n')[0]} - Błąd`);}

            
            await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
            await Promise.race([
                successAlert.first().waitFor({ state: 'visible', timeout: timeout }),
                errorAlert.first().waitFor({ state: 'visible', timeout: timeout })
            ]);
            if(await errorAlert.first().isVisible()) {
                const trescBledy = await errorAlert.first().locator('.alert-message').innerText();
                throw new Error(`Błąd przy dodawaniu wpisu: ${trescBledy}`);
            }




       // console.log(`[ETAP 2]: Dodano wpis. Komunikat: ${await successAlert.first().locator('.alert-message').innerText()}`);
            
           // pagesAfterE1.push(site);
           pagesAfterE2.push(site);
            
            udane_e2++;
            fs.appendFileSync('sukces_e2.txt', `${originUrl} Sukces\n`);
            console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] ETAP 2 ZAKOŃCZONY SUKCESEM: ${originUrl}.\n`);
    }
    catch (err: any) {
        nieudane_e2++;
        const error_reason = err.name === 'TimeoutError' ? 'Przekroczono czas (Timeout serwera)' : err.message.split('\n')[0];
        console.warn(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Błąd podczas dodawania wpisu na: ${originUrl}`);
        fs.appendFileSync('bledy_e2.txt', `${originUrl} [Etap 2 Wpis]: ${error_reason}\n`);
        console.warn(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] POMINIĘTO: ${originUrl}.\n`);
    }
    finally {
        await context.close();
    }
}











// ##################################################################################################################################

  await browser.close();

  // 3. Podsumowanie w konsoli
  console.log('\n================ [ETAP 1]: PODSUMOWANIE ================\n');
  console.log(`[Etap 1]: Wszystkich stron: ${sites.length}`);
  console.log(`[Etap 1]: Zakończone sukcesem: ${udane_e1}`);
  console.log(`[Etap 1]: Pominięte z błędami: ${nieudane_e1}`);
  console.log(`[Etap 1]: Szczegóły zapisano w plikach sukces_e1.txt oraz bledy_e1.txt`);
  console.log('\n================ [ETAP 2]: PODSUMOWANIE ================\n');
  console.log(`[Etap 2]: Wszystkich stron: ${pagesAfterE1.length}`);
  console.log(`[Etap 2]: Zakończone sukcesem: ${udane_e2}`);
  console.log(`[Etap 2]: Pominięte z błędami: ${nieudane_e2}`);
  console.log(`[Etap 2]: Szczegóły zapisano w plikach sukces_e2.txt oraz bledy_e2.txt`);
  console.log('\n==============================================\n');
}

run();

