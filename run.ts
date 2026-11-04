import { chromium, Locator } from 'playwright';
import * as fs from 'fs';
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
    const excerptText = 'Został on stworzony, żeby przybliżyć niniejszą działalność. ';
    const postContent = 'Znajdziesz tu różne artykuły przedstawiające oferowane produkty oraz świadczone usługi. Miłej lektury!';
    
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
    console.log(`\n================ ROZPOCZYNAM ETAP 1 - DODAWANIE KATEGORII ================\n\n`);
    console.log(`[ETAP 1]: Załadowano ${sites.length} stron do przetworzenia.\n`);
    
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
        
        try {
            
            // ### AUTORYZACJA
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Logowanie do panelu: ${originUrl}`);

            // KROK 1: Wejście w link panelu
            await page.goto(site.url, { waitUntil: 'load' });
            
            // KROK 2: Logowanie do panelu
            await page.getByRole('textbox', { name: 'Użytkownik' }).fill(site.login);
            await page.getByRole('textbox', { name: 'Hasło' }).fill(site.password);
            await page.getByRole('button', { name: 'Zaloguj' }).click();

            // KROK 3: Weryfikacja logowania 
            await page.getByRole('textbox', { name: 'Hasło' }).waitFor({ state: 'detached', timeout: timeout });
            
            // ### TWORZENIE KATEGORII
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Tworzenie kategorii: ${originUrl}`);

            // KROK 1: Wejście w link panelu tworzenia kategorii
            await page.goto(`${originUrl}/administrator/index.php?option=com_categories&view=category&layout=edit&extension=com_content`, { waitUntil: 'load' });

            // KROK 2: Wpisanie nazwy kategorii
            await page.getByRole('textbox', { name: 'Tytuł' }).fill(h1Title);

            // Krok 3: Zapis kategorii, weryfikacja zapisu oraz alternatywna kategoria
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
            
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Dodano kategorię. Komunikat: ${await successAlert.first().locator('.alert-message').innerText()}`);
            
            // ### MODYFIKACJA KATEGORII
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Modyfikacja kategorii: ${originUrl}`);
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Dodawanie nagłówka <h1>: ${originUrl}`);
            // Krok 1: Dodawanie nagłówka h1 do treści kategorii
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

            // Krok 2: Wybór Layout2 jeśli jest dostępny w szablonie. Jeśli nie ma, po prostu kontynuuj
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Wybór alternatywnego układu: ${originUrl}`);
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
            
            console.log(`[ETAP 1]: [${i+1}/${sites.length}] Ustawiono Layout2 oraz dodano <h1>${h1Title}</h1>. Komunikat: ${await successAlert.first().locator('.alert-message').innerText()}`);
            
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
console.log(`\n================ ROZPOCZYNAM ETAP 2 - DODAWANIE WPISU ================\n\n`);
console.log(`ETAP 2: Załadowano ${pagesAfterE1.length} stron do przetworzenia.\n`);

let nr = 0;
for(const site of pagesAfterE1) {
    nr++;
    const originUrl = new URL(site.url).origin;
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(defaulttimeout);
    successAlert = page.locator('joomla-alert[type="success"]');
    errorAlert = page.locator('joomla-alert[type="danger"]');

    try {
        
            // ### AUTORYZACJA
            console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Logowanie do panelu: ${originUrl}`);

            // KROK 1: Wejście w link panelu
            await page.goto(site.url, { waitUntil: 'load' });
            
            // KROK 2: Logowanie do panelu
            await page.getByRole('textbox', { name: 'Użytkownik' }).fill(site.login);
            await page.getByRole('textbox', { name: 'Hasło' }).fill(site.password);
            await page.getByRole('button', { name: 'Zaloguj' }).click();

            // KROK 3: Weryfikacja logowania 
            await page.getByRole('textbox', { name: 'Hasło' }).waitFor({ state: 'detached', timeout: timeout });
            
            // ### TWORZENIE WPISU
            console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Tworzenie wpisu: ${originUrl}`);

            // KROK 1: Wejście w link panelu tworzenia kategorii
            await page.goto(`${originUrl}/administrator/index.php?option=com_content&view=article&layout=edit`, { waitUntil: 'load' });

            // KROK 2: Wpisanie tytułu wpisu
            await page.getByRole('textbox', { name: 'Tytuł' }).fill(postTitle);

            // KROK 3: Wybór kategorii wpisu
            console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Wybór alternatywnego układu: ${originUrl}`);
            
            await page.locator('joomla-field-fancy-select').first().click();
            
            await page.getByRole('option', { name: site.category, exact: true }).click();

            // const opcjaArtykuly = page.getByRole('option', { name: h1TitleSecond, exact: true });
            // const opcjaBlog = page.getByRole('option', { name: h1TitleFirst, exact: true });
            
            // if(await opcjaArtykuly.isVisible({timeout: 2000}).catch(() => false)) {
            //     await opcjaArtykuly.click();
            //     console.log('[KATEGORIA]: Znaleziono i wybrano Artykuły blogowe');
            // } else {
            //     await opcjaBlog.click();
            //     console.log('[KATEGORIA]: Nie znaleziono Artykuły blogowe, wybrano Blog');
            // }
            
            // KROK 4: Wybór Meta - noindex, nofollow
            const metaDaneButton = page.getByRole('button', { name: 'Meta dane ' });
            if(await metaDaneButton.isVisible()){
                await metaDaneButton.click();
                const selectNoindex = page.getByLabel('Wyszukiwarki');
                if( await selectNoindex.isVisible()) {
                    const noIndexOption = (await selectNoindex.locator('option[value="noindex, nofollow"]').count()) > 0;
                    if(noIndexOption) {
                        await selectNoindex.selectOption('noindex, nofollow');
                        console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Ustawiono meta tag "noindex, nofollow"`);
                    } else {
                        console.log(`[ETAP 2]: [${nr}/${pagesAfterE1.length}] Opcja "noindex, nofollow" nie jest dostępna w tym szablonie, pomijanie zmiany meta tagu`);
                    }
                }
            }
            
            await page.getByRole('button', { name: 'Zapisz', exact: true }).click();
            await Promise.race([
                successAlert.first().waitFor({ state: 'visible', timeout: timeout }),
                errorAlert.first().waitFor({ state: 'visible', timeout: timeout })
            ]);
            
            if(await errorAlert.first().isVisible()) {
                const trescBledy = await errorAlert.first().locator('.alert-message').innerText();
                throw new Error(`Błąd przy dodawaniu wpisu: ${trescBledy}`);
            }



// Krok 1: Dodawanie nagłówka h1 do treści kategorii blabla
         
                // const kolumna12 = page.getByText('kolumna -12');
                const kolumna12Add = page.locator('.btn-grid, button, a').filter({hasText: /kolumna\s*-12/i }).first();
                if((await kolumna12Add.count()) > 0){
                    await kolumna12Add.click();
                    
                    const blokTresc = page.getByText('Treść', {exact: true}).last();
                    await blokTresc.waitFor({ state: 'visible', timeout: timeout });
                    await blokTresc.click();
                    
                    await page.getByRole('menuitem', { name: 'Narzędzia' }).click();
                    await page.getByText('Kod źródłowy').click();
                    
                    const oknoKodu = page.getByRole('dialog', { name: 'Kod źródłowy' });
                    await oknoKodu.waitFor({ state: 'visible', timeout: timeout });
                    
                    await oknoKodu.locator('textarea').fill(`<p>${excerptText}</p>`);
                    
                    await oknoKodu.getByRole('button', { name: 'Zapisz' }).click();
                    
                    await oknoKodu.waitFor({ state: 'hidden', timeout: timeout });



                    const readmore = page.getByText(/czytaj więcej/i).first();
                    if(await readmore.isVisible({timeout:3000}).catch(() => false)) {
                        await readmore.click();
                    }

                    await kolumna12Add.click();

                    const blokTresc2 = page.getByText('Treść', {exact: true}).last();
                    await blokTresc2.waitFor({ state: 'visible', timeout: timeout });
                    await blokTresc2.click();
                    
                    await page.getByRole('menuitem', { name: 'Narzędzia' }).click();
                    await page.getByText('Kod źródłowy').click();
                    
                    const oknoKodu2 = page.getByRole('dialog', { name: 'Kod źródłowy' });
                    await oknoKodu2.waitFor({ state: 'visible', timeout: timeout });
                    
                    await oknoKodu2.locator('textarea').fill(`<p>${postContent}</p>`);
                    
                    await oknoKodu2.getByRole('button', { name: 'Zapisz' }).click();
                    
                    await oknoKodu2.waitFor({ state: 'hidden', timeout: timeout });
                }
               





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
        console.warn(`[ETAP 2]: Błąd podczas dodawania wpisu na: ${originUrl}`);
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

