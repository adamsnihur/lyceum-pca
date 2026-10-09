# Analiza Głównych Składowych (PCA - Principal Component Analysis)

Dedykowana aplikacja edukacyjna i analityczna w standardzie **Lyceum (SaaS Light EdTech)**, łącząca rygorystyczne wyprowadzenia matematyczne i algebrę liniową z dotykowym symulatorem 60 FPS, sprzężonymi rzutami, analizą 3D, wykresem osypiska (Scree Plot) oraz implementacjami w Pythonie.

---

## Szybkie Uruchomienie

Aplikacja jest w pełni samodzielna (standalone) i działa bezpośrednio w przeglądarce bez konieczności kompilacji czy instalacji paczek Node.js.

### Otwarcie lokalne:
```bash
open index.html
```

### Uruchomienie serwera developerskiego:
```bash
python3 -m http.server 8080
# Otwórz w przeglądarce: http://localhost:8080
```

---

## Architektura Dydaktyczna & Moduły

1. **Intuicja Geometryczna: Obrót Osi i Maksymalizacja Wariancji Rzutu**
   - Interaktywny Canvas z chmurą punktów 2D i obracającą się osią projekcji pod kątem $\theta \in [0^\circ, 180^\circ]$.
   - Wizualizacja rzutów prostopadłych i błędu rekonstrukcji (czerwone linie przerywane).
   - Równoważność kryteriów: $\max \text{Wariancja rzutu} \iff \min \text{MSE rekonstrukcji}$ wynikająca z Twierdzenia Pitagorasa ($d_i^2 = \text{proj}_i^2 + \text{err}_i^2$).
   - Wykres krzywej wariancji w Plotly z ruchomym punktem i przyciskami szybkiego dopasowania do $PC_1$ i $PC_2$.

2. **Rygor Analityczny: Wyprowadzenie przez Mnożniki Lagrange'a i SVD**
   - Krok po kroku: Centrowanie danych ($\tilde{X} = X - \mathbf{1}\mu^T$), macierz kowariancji $\Sigma = \frac{1}{n-1} \tilde{X}^T \tilde{X}$, wariancja rzutu $u^T \Sigma u$.
   - Funkcja Lagrange'a: $\mathcal{L}(u, \lambda) = u^T \Sigma u - \lambda(u^T u - 1)$.
   - Równanie własne $\Sigma u = \lambda u$ i dowód, że wariancja wzdłuż osi $u$ jest równa wartości własnej $\lambda$.
   - Związek z dekompozycją SVD ($X = U S V^T$) i dlaczego algorytmy numeryczne (scikit-learn) unikają jawnego liczenia $X^T X$ z uwagi na wskaźnik uwarunkowania $\kappa(X)$.

3. **Dotykowy Symulator PCA 2D: Chmura Punktów, Elipsa i De-korelacja**
   - Dwa sprzężone wykresy Plotly: przestrzeń pierwotna $(X_1, X_2)$ z wektorami własnymi i elipsą 95% ufności vs przestrzeń obrócona $(PC_1, PC_2)$.
   - Suwaki parametrów populacji: korelacja $\rho$, wariancje $\sigma_1^2, \sigma_2^2$, liczba punktów $N$.
   - Prezentacja macierzy kowariancji: w bazie PCA elementy pozadiagonalne wynoszą dokładnie $0.00$ (de-korelacja cech).

4. **Wielowymiarowa Redukcja: Rzut 3D do 2D oraz Wykres Osypiska (Scree Plot)**
   - Interaktywny model 3D w Plotly z płaszczyzną projekcji wyznaczoną przez $PC_1 - PC_2$.
   - Wykres osypiska (Scree Plot) dla 8 zmiennych: słupki wariancji składowych i krzywa skumulowana.
   - Suwak progu odcięcia wariancji (np. 85%, 95%) z automatycznym wyznaczaniem optymalnej liczby składowych $k^*$.
   - Kryterium łokcia (Elbow method) oraz kryterium Kaisera ($\lambda > 1$).

5. **Kardynalne Pułapki i Diagnostyka PCA**
   - Wpływ braku standaryzacji (StandardScaler) z interaktywnym przełącznikiem.
   - Ograniczenia liniowości PCA a rozmaitości nieliniowe (t-SNE, UMAP, Kernel PCA).
   - Ekstremalna wrażliwość na outliery ze względu na kwadraty odchyleń.
   - Nienadzorowany charakter PCA (brak gwarancji separowalności klas decyzyjnych).

6. **Sprawdzian Zrozumienia: Quiz Koncepcyjny Lyceum**
   - 5 pytań jedno- i wielokrotnego wyboru o wysokim rygorze merytorycznym.
   - Natychmiastowy feedback, szczegółowe uzasadnienia dla każdej opcji i licznik punktów na żywo.

7. **Produkcyjna Implementacja w Pythonie**
   - Trzy pełne skrypty: Czysty NumPy przez macierz kowariancji, NumPy przez SVD, potok scikit-learn Pipeline z `StandardScaler`.
   - Przycisk kopiowania kodu do schowka z powiadomieniem.

---

## Weryfikacja Jakości (Quality Gates)

Strona została zweryfikowana automatycznym testem Playwright (`verify_site.py`), potwierdzając:
- **0 błędów w konsoli przeglądarki** (brak warningów i wyjątków JS),
- **0 błędów parsowania KaTeX i Plotly**,
- Pełną reaktywność suwaków, przełączników i animacji,
- Prawidłowe działanie sprawdzania odpowiedzi w quizie i zliczania punktów,
- Wygenerowany artefakt weryfikacyjny: `screenshot_verified.png`.
