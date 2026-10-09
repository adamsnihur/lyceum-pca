/**
 * Lyceum: Analiza Głównych Składowych (PCA)
 * Kompletny silnik matematyczny, interaktywny Canvas 60 FPS, Plotly.js i KaTeX
 */

document.addEventListener("DOMContentLoaded", function () {
  // Inicjalizacja KaTeX dla całej strony
  if (typeof renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }

  initModule1();
  initModule3();
  initModule4();
  initModule5();
  initModule6();
  initModule7();
});

/* ==========================================================================
   MODUŁ 1: Intuicja Geometryczna (Canvas 2D + Wykres Wariancji)
   ========================================================================== */
function initModule1() {
  const canvas = document.getElementById("m1Canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const sliderAngle = document.getElementById("m1SliderAngle");
  const valAngle = document.getElementById("m1ValAngle");
  const outVariance = document.getElementById("m1OutVariance");
  const outVarPercent = document.getElementById("m1OutVarPercent");
  const outMSE = document.getElementById("m1OutMSE");
  const outStatus = document.getElementById("m1OutStatus");
  const barVariance = document.getElementById("m1BarVariance");
  const barMSE = document.getElementById("m1BarMSE");

  const btnOptimum = document.getElementById("m1BtnOptimum");
  const btnOrthogonal = document.getElementById("m1BtnOrthogonal");
  const btnToggleAnimation = document.getElementById("m1BtnToggleAnimation");
  const animIcon = document.getElementById("m1AnimIcon");
  const animLabel = document.getElementById("m1AnimLabel");

  // Generowanie deterministycznej chmury punktów w 2D (centrowana, kąt ok. 40 stopni)
  const N = 40;
  const rawPoints = [];
  // Używamy deterministycznego pseudo-losowego generatora z ziarnem
  let seed = 12345;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const trueAngleRad = (40 * Math.PI) / 180;
  const cosT = Math.cos(trueAngleRad);
  const sinT = Math.sin(trueAngleRad);
  const spreadMajor = 3.6;
  const spreadMinor = 1.1;

  let meanX = 0;
  let meanY = 0;

  for (let i = 0; i < N; i++) {
    // Rozkład Gaussa przez Box-Muller
    const u1 = Math.max(1e-6, pseudoRandom());
    const u2 = pseudoRandom();
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    const x_rot = z1 * spreadMajor;
    const y_rot = z2 * spreadMinor;

    const px = x_rot * cosT - y_rot * sinT;
    const py = x_rot * sinT + y_rot * cosT;

    rawPoints.push({ x: px, y: py });
    meanX += px;
    meanY += py;
  }

  meanX /= N;
  meanY /= N;

  // Ścisłe centrowanie
  const points = rawPoints.map(p => ({
    x: p.x - meanX,
    y: p.y - meanY
  }));

  // Całkowita suma kwadratów (Twierdzenie Pitagorasa)
  let totalVar = 0;
  for (const p of points) {
    totalVar += (p.x * p.x + p.y * p.y) / N;
  }

  // Pre-kalkulacja krzywej wariancji w pełnym zakresie 0-180 stopni
  const curveAngles = [];
  const curveVariances = [];
  let maxVar = -1;
  let maxVarAngleDeg = 0;

  for (let deg = 0; deg <= 180; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);

    let v = 0;
    for (const p of points) {
      const proj = p.x * ux + p.y * uy;
      v += (proj * proj) / N;
    }

    curveAngles.push(deg);
    curveVariances.push(v);

    if (v > maxVar) {
      maxVar = v;
      maxVarAngleDeg = deg;
    }
  }

  // Inicjalizacja wykresu krzywej wariancji w Plotly
  const traceCurve = {
    x: curveAngles,
    y: curveVariances,
    type: "scatter",
    mode: "lines",
    name: "Wariancja V(θ)",
    line: { color: "#2563eb", width: 2.5 }
  };

  const traceCurrent = {
    x: [45],
    y: [curveVariances[45]],
    type: "scatter",
    mode: "markers",
    name: "Bieżące θ",
    marker: { color: "#e11d48", size: 10, symbol: "circle" }
  };

  const traceMaxPoint = {
    x: [maxVarAngleDeg],
    y: [maxVar],
    type: "scatter",
    mode: "markers+text",
    name: "Optimum (PC1)",
    text: ["PC1"],
    textposition: "top center",
    marker: { color: "#059669", size: 8, symbol: "diamond" }
  };

  const layoutCurve = {
    margin: { l: 40, r: 20, t: 15, b: 35 },
    xaxis: {
      title: "Kąt θ (°)",
      dtick: 30,
      range: [0, 180],
      gridcolor: "#f1f5f9"
    },
    yaxis: {
      title: "Wariancja",
      gridcolor: "#f1f5f9"
    },
    showlegend: false,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent"
  };

  Plotly.newPlot("m1PlotVarianceCurve", [traceCurve, traceCurrent, traceMaxPoint], layoutCurve, {
    responsive: true,
    displayModeBar: false
  });

  // Skalowanie układu współrzędnych Canvas
  const scale = 32; // pikseli na jednostkę
  const originX = canvas.width / 2;
  const originY = canvas.height / 2;

  function renderCanvas(angleDeg) {
    valAngle.textContent = `${angleDeg}°`;
    const angleRad = (angleDeg * Math.PI) / 180;
    const ux = Math.cos(angleRad);
    const uy = Math.sin(angleRad);

    // Obliczenie wariancji i MSE
    let currentVar = 0;
    for (const p of points) {
      const proj = p.x * ux + p.y * uy;
      currentVar += (proj * proj) / N;
    }
    const currentMSE = Math.max(0, totalVar - currentVar);
    const percentVar = (currentVar / totalVar) * 100;

    outVariance.textContent = currentVar.toFixed(2);
    outVarPercent.textContent = `${percentVar.toFixed(1)}%`;
    outMSE.textContent = currentMSE.toFixed(2);

    barVariance.style.width = `${Math.min(100, percentVar)}%`;
    barMSE.style.width = `${Math.min(100, (currentMSE / totalVar) * 100)}%`;

    const diffFromOpt = Math.abs(angleDeg - maxVarAngleDeg);
    if (diffFromOpt === 0 || diffFromOpt === 180) {
      outStatus.textContent = "🎯 Idealne PC1: Globalne maksimum wariancji!";
      outStatus.className = "text-xs font-bold text-emerald-800 mt-0.5";
    } else if (Math.abs(diffFromOpt - 90) === 0) {
      outStatus.textContent = "📐 Kierunek PC2: Minimalna wariancja (maks. błąd)";
      outStatus.className = "text-xs font-bold text-amber-800 mt-0.5";
    } else {
      outStatus.textContent = `Obrót osi: ${angleDeg}° (odległość od PC1: ${Math.min(diffFromOpt, 180 - diffFromOpt)}°)`;
      outStatus.className = "text-xs font-semibold text-slate-700 mt-0.5";
    }

    // Aktualizacja punktu na wykresie Plotly
    Plotly.restyle("m1PlotVarianceCurve", {
      x: [[angleDeg]],
      y: [[currentVar]]
    }, [1]);

    // Rysowanie Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Siatka i osie współrzędnych (subtelne)
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(canvas.width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvas.height);
    ctx.stroke();

    // Rysowanie obracającej się prostej projekcji (Niebieska oś)
    const lineLen = 400;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX - ux * lineLen, originY + uy * lineLen);
    ctx.lineTo(originX + ux * lineLen, originY - uy * lineLen);
    ctx.stroke();

    // Etykieta osi
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText("Oś Projekcji (u)", originX + ux * (lineLen * 0.7) + 8, originY - uy * (lineLen * 0.7) - 8);

    // Rysowanie rzutów prostopadłych (czerwone linie błędu) i punktów
    for (const p of points) {
      const projDist = p.x * ux + p.y * uy;
      const projX = projDist * ux;
      const projY = projDist * uy;

      const px = originX + p.x * scale;
      const py = originY - p.y * scale;
      const prx = originX + projX * scale;
      const pry = originY - projY * scale;

      // Czerwona linia błędu (prostopadła do osi)
      ctx.strokeStyle = "rgba(225, 29, 72, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(prx, pry);
      ctx.stroke();
      ctx.setLineDash([]);

      // Rzut na oś (jasnoniebieski punkt)
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(prx, pry, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Punkt oryginalny (ciemnogranatowy okrąg z białą obwódką)
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Środek układu (0,0)
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(originX, originY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  sliderAngle.addEventListener("input", function () {
    renderCanvas(parseInt(this.value, 10));
  });

  btnOptimum.addEventListener("click", function () {
    stopAnimation();
    sliderAngle.value = maxVarAngleDeg;
    renderCanvas(maxVarAngleDeg);
  });

  btnOrthogonal.addEventListener("click", function () {
    stopAnimation();
    const orthoAngle = (maxVarAngleDeg + 90) % 180;
    sliderAngle.value = orthoAngle;
    renderCanvas(orthoAngle);
  });

  let isAnimating = false;
  let animFrameId = null;

  function stopAnimation() {
    if (isAnimating) {
      isAnimating = false;
      cancelAnimationFrame(animFrameId);
      animIcon.textContent = "▶️";
      animLabel.textContent = "Animuj pełny obrót 360°";
    }
  }

  btnToggleAnimation.addEventListener("click", function () {
    if (isAnimating) {
      stopAnimation();
    } else {
      isAnimating = true;
      animIcon.textContent = "⏸️";
      animLabel.textContent = "Zatrzymaj animację";

      let currentDeg = parseInt(sliderAngle.value, 10);
      function step() {
        if (!isAnimating) return;
        currentDeg = (currentDeg + 1) % 180;
        sliderAngle.value = currentDeg;
        renderCanvas(currentDeg);
        animFrameId = requestAnimationFrame(step);
      }
      animFrameId = requestAnimationFrame(step);
    }
  });

  // Pierwsze wyrenderowanie
  renderCanvas(parseInt(sliderAngle.value, 10));
}

/* ==========================================================================
   MODUŁ 3: Interaktywny Sandbox PCA 2D (Chmura, Wektory i De-korelacja)
   ========================================================================== */
function initModule3() {
  const sliderRho = document.getElementById("m3SliderRho");
  const valRho = document.getElementById("m3ValRho");
  const sliderVar1 = document.getElementById("m3SliderVar1");
  const valVar1 = document.getElementById("m3ValVar1");
  const sliderVar2 = document.getElementById("m3SliderVar2");
  const valVar2 = document.getElementById("m3ValVar2");
  const sliderPoints = document.getElementById("m3SliderPoints");
  const valPoints = document.getElementById("m3ValPoints");

  const m3Cov00 = document.getElementById("m3Cov00");
  const m3Cov01 = document.getElementById("m3Cov01");
  const m3Cov10 = document.getElementById("m3Cov10");
  const m3Cov11 = document.getElementById("m3Cov11");

  const m3CovPca00 = document.getElementById("m3CovPca00");
  const m3CovPca01 = document.getElementById("m3CovPca01");
  const m3CovPca10 = document.getElementById("m3CovPca10");
  const m3CovPca11 = document.getElementById("m3CovPca11");

  const m3OutLambda1 = document.getElementById("m3OutLambda1");
  const m3OutLambda2 = document.getElementById("m3OutLambda2");
  const m3OutVarRatio1 = document.getElementById("m3OutVarRatio1");
  const m3OutVarRatio2 = document.getElementById("m3OutVarRatio2");
  const m3BarRatio1 = document.getElementById("m3BarRatio1");
  const m3BarRatio2 = document.getElementById("m3BarRatio2");

  if (!sliderRho) return;

  // Deterministyczny generator Box-Mullera
  function generateBivariateData(N, var1, var2, rho) {
    const s1 = Math.sqrt(var1);
    const s2 = Math.sqrt(var2);
    const dataX = [];
    const dataY = [];

    let seed = 98765;
    function rnd() {
      seed = (seed * 16807 + 1) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    // Dekompozycja Choleskiego dla macierzy 2x2
    const L11 = s1;
    const L21 = rho * s2;
    const L22 = s2 * Math.sqrt(Math.max(0, 1 - rho * rho));

    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < N; i++) {
      const u1 = Math.max(1e-7, rnd());
      const u2 = rnd();
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      const x = L11 * z1;
      const y = L21 * z1 + L22 * z2;

      dataX.push(x);
      dataY.push(y);
      sumX += x;
      sumY += y;
    }

    const mX = sumX / N;
    const mY = sumY / N;

    // Centrowanie próbki
    const cX = dataX.map(x => x - mX);
    const cY = dataY.map(y => y - mY);

    return { x: cX, y: cY };
  }

  // Wyprowadzenie wektorów własnych macierzy 2x2
  function eigenDecomposition2x2(s11, s12, s22) {
    const trace = s11 + s22;
    const det = s11 * s22 - s12 * s12;
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));

    const l1 = (trace + disc) / 2;
    const l2 = (trace - disc) / 2;

    // Wektor własny dla l1: (s11 - l1) * vx + s12 * vy = 0
    let v1x, v1y;
    if (Math.abs(s12) > 1e-6) {
      v1x = l1 - s22;
      v1y = s12;
    } else {
      v1x = s11 >= s22 ? 1 : 0;
      v1y = s11 >= s22 ? 0 : 1;
    }
    const norm1 = Math.hypot(v1x, v1y) || 1;
    v1x /= norm1;
    v1y /= norm1;

    // v2 jest prostopadły do v1
    const v2x = -v1y;
    const v2y = v1x;

    return {
      lambda1: l1,
      lambda2: l2,
      v1: { x: v1x, y: v1y },
      v2: { x: v2x, y: v2y }
    };
  }

  function updateSandbox() {
    const rho = parseFloat(sliderRho.value);
    const var1 = parseFloat(sliderVar1.value);
    const var2 = parseFloat(sliderVar2.value);
    const N = parseInt(sliderPoints.value, 10);

    valRho.textContent = rho.toFixed(2);
    valVar1.textContent = var1.toFixed(2);
    valVar2.textContent = var2.toFixed(2);
    valPoints.textContent = N;

    const data = generateBivariateData(N, var1, var2, rho);

    // Obliczenie empirycznej macierzy kowariancji
    let c11 = 0, c12 = 0, c22 = 0;
    for (let i = 0; i < N; i++) {
      c11 += (data.x[i] * data.x[i]) / (N - 1);
      c12 += (data.x[i] * data.y[i]) / (N - 1);
      c22 += (data.y[i] * data.y[i]) / (N - 1);
    }

    const eigen = eigenDecomposition2x2(c11, c12, c22);

    // Wyświetlenie macierzy kowariancji oryginalnej
    m3Cov00.textContent = c11.toFixed(2);
    m3Cov01.textContent = c12.toFixed(2);
    m3Cov10.textContent = c12.toFixed(2);
    m3Cov11.textContent = c22.toFixed(2);

    // Wyświetlenie macierzy kowariancji PCA (czysto diagonalna)
    m3CovPca00.textContent = eigen.lambda1.toFixed(2);
    m3CovPca01.textContent = "0.00";
    m3CovPca10.textContent = "0.00";
    m3CovPca11.textContent = eigen.lambda2.toFixed(2);

    // Wyjaśniona wariancja
    const sumLambda = eigen.lambda1 + eigen.lambda2;
    const ratio1 = (eigen.lambda1 / sumLambda) * 100;
    const ratio2 = (eigen.lambda2 / sumLambda) * 100;

    m3OutLambda1.textContent = eigen.lambda1.toFixed(2);
    m3OutLambda2.textContent = eigen.lambda2.toFixed(2);
    m3OutVarRatio1.textContent = `${ratio1.toFixed(1)}%`;
    m3OutVarRatio2.textContent = `${ratio2.toFixed(1)}%`;

    m3BarRatio1.style.width = `${ratio1}%`;
    m3BarRatio2.style.width = `${ratio2}%`;

    // 1. Punkty elipsy w przestrzeni oryginalnej (2 sigma = ~95% ufności)
    const ellipseT = [];
    const ellipseX = [];
    const ellipseY = [];
    for (let t = 0; t <= 2 * Math.PI + 0.05; t += 0.05) {
      const e_u1 = 2 * Math.sqrt(Math.max(0, eigen.lambda1)) * Math.cos(t);
      const e_u2 = 2 * Math.sqrt(Math.max(0, eigen.lambda2)) * Math.sin(t);
      ellipseX.push(e_u1 * eigen.v1.x + e_u2 * eigen.v2.x);
      ellipseY.push(e_u1 * eigen.v1.y + e_u2 * eigen.v2.y);
    }

    // Strzałki wektorów własnych (długość proporcjonalna do 2 * sqrt(lambda))
    const arrowLen1 = 2 * Math.sqrt(Math.max(0, eigen.lambda1));
    const arrowLen2 = 2 * Math.sqrt(Math.max(0, eigen.lambda2));

    const pc1X = [0, eigen.v1.x * arrowLen1];
    const pc1Y = [0, eigen.v1.y * arrowLen1];
    const pc2X = [0, eigen.v2.x * arrowLen2];
    const pc2Y = [0, eigen.v2.y * arrowLen2];

    const traceOrigPoints = {
      x: data.x,
      y: data.y,
      mode: "markers",
      type: "scatter",
      marker: { color: "rgba(15, 23, 42, 0.6)", size: 6 },
      name: "Punkty (X1, X2)"
    };

    const traceEllipse = {
      x: ellipseX,
      y: ellipseY,
      mode: "lines",
      type: "scatter",
      line: { color: "rgba(37, 99, 235, 0.4)", width: 2, dash: "dot" },
      name: "Elipsa 95%"
    };

    const traceArrowPC1 = {
      x: pc1X,
      y: pc1Y,
      mode: "lines+markers",
      type: "scatter",
      line: { color: "#2563eb", width: 4 },
      marker: { size: [0, 8], symbol: "arrow" },
      name: "PC1"
    };

    const traceArrowPC2 = {
      x: pc2X,
      y: pc2Y,
      mode: "lines+markers",
      type: "scatter",
      line: { color: "#059669", width: 3.5 },
      marker: { size: [0, 8], symbol: "arrow" },
      name: "PC2"
    };

    const layoutOrig = {
      margin: { l: 35, r: 20, t: 15, b: 35 },
      xaxis: { title: "X1", range: [-6, 6], zeroline: true, zerolinecolor: "#cbd5e1" },
      yaxis: { title: "X2", range: [-6, 6], zeroline: true, zerolinecolor: "#cbd5e1", scaleanchor: "x", scaleratio: 1 },
      showlegend: false,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent"
    };

    Plotly.react("m3PlotOriginal", [traceOrigPoints, traceEllipse, traceArrowPC1, traceArrowPC2], layoutOrig, {
      responsive: true,
      displayModeBar: false
    });

    // 2. Punkty w przestrzeni zredukowanej / po rotacji do PCA
    const pcaX = [];
    const pcaY = [];
    for (let i = 0; i < N; i++) {
      // Z = X * V
      const z1 = data.x[i] * eigen.v1.x + data.y[i] * eigen.v1.y;
      const z2 = data.x[i] * eigen.v2.x + data.y[i] * eigen.v2.y;
      pcaX.push(z1);
      pcaY.push(z2);
    }

    const ellipsePcaX = [];
    const ellipsePcaY = [];
    for (let t = 0; t <= 2 * Math.PI + 0.05; t += 0.05) {
      ellipsePcaX.push(2 * Math.sqrt(Math.max(0, eigen.lambda1)) * Math.cos(t));
      ellipsePcaY.push(2 * Math.sqrt(Math.max(0, eigen.lambda2)) * Math.sin(t));
    }

    const tracePcaPoints = {
      x: pcaX,
      y: pcaY,
      mode: "markers",
      type: "scatter",
      marker: { color: "rgba(5, 150, 105, 0.65)", size: 6 },
      name: "Punkty (PC1, PC2)"
    };

    const tracePcaEllipse = {
      x: ellipsePcaX,
      y: ellipsePcaY,
      mode: "lines",
      type: "scatter",
      line: { color: "rgba(5, 150, 105, 0.4)", width: 2, dash: "dot" },
      name: "Elipsa PCA"
    };

    const layoutTransformed = {
      margin: { l: 35, r: 20, t: 15, b: 35 },
      xaxis: { title: "PC1 (Maksymalna Wariancja)", range: [-6, 6], zeroline: true, zerolinecolor: "#cbd5e1" },
      yaxis: { title: "PC2 (Ortogonalna Wariancja)", range: [-6, 6], zeroline: true, zerolinecolor: "#cbd5e1", scaleanchor: "x", scaleratio: 1 },
      showlegend: false,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent"
    };

    Plotly.react("m3PlotTransformed", [tracePcaPoints, tracePcaEllipse], layoutTransformed, {
      responsive: true,
      displayModeBar: false
    });
  }

  [sliderRho, sliderVar1, sliderVar2, sliderPoints].forEach(sl => {
    sl.addEventListener("input", updateSandbox);
  });

  updateSandbox();
}

/* ==========================================================================
   MODUŁ 4: Redukcja 3D do 2D oraz Scree Plot
   ========================================================================== */
function initModule4() {
  const plot3D = document.getElementById("m4Plot3D");
  const plotScree = document.getElementById("m4PlotScree");
  const sliderThreshold = document.getElementById("m4SliderThreshold");
  const valThreshold = document.getElementById("m4ValThreshold");
  const badgeComponents = document.getElementById("m4BadgeComponents");
  const btnReset3D = document.getElementById("m4BtnReset3D");

  if (!plot3D || !plotScree) return;

  // 1. Generowanie chmury 3D
  const N3D = 120;
  const p3X = [], p3Y = [], p3Z = [];
  let seed = 54321;
  function rnd3() {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < N3D; i++) {
    const u1 = Math.max(1e-7, rnd3());
    const u2 = rnd3();
    const u3 = Math.max(1e-7, rnd3());
    const u4 = rnd3();

    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * 3.2; // PC1
    const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2) * 1.6; // PC2
    const z3 = Math.sqrt(-2.0 * Math.log(u3)) * Math.cos(2.0 * Math.PI * u4) * 0.45; // PC3 (mały szum)

    // Rotacja w przestrzeni 3D
    const rx = 0.8 * z1 - 0.5 * z2 + 0.3 * z3;
    const ry = 0.5 * z1 + 0.8 * z2 + 0.1 * z3;
    const rz = -0.3 * z1 + 0.2 * z2 + 0.9 * z3;

    p3X.push(rx);
    p3Y.push(ry);
    p3Z.push(rz);
  }

  // Siatka płaszczyzny projekcji PC1-PC2
  const planeSize = 4.5;
  const planeX = [
    [-planeSize, planeSize],
    [-planeSize, planeSize]
  ].map(row => row.map(v => 0.8 * v));

  const planeY = [
    [-planeSize, -planeSize],
    [planeSize, planeSize]
  ].map(row => row.map(v => 0.7 * v));

  const planeZ = [
    [-0.3 * -planeSize, -0.3 * planeSize],
    [-0.3 * -planeSize, -0.3 * planeSize]
  ];

  const tracePoints3D = {
    x: p3X,
    y: p3Y,
    z: p3Z,
    mode: "markers",
    type: "scatter3d",
    marker: {
      size: 4,
      color: p3X,
      colorscale: "Viridis",
      opacity: 0.85
    },
    name: "Punkty 3D"
  };

  const tracePlane3D = {
    x: [[-3.5, 3.5], [-3.5, 3.5]],
    y: [[-3.5, -3.5], [3.5, 3.5]],
    z: [[-0.8, 1.2], [-1.2, 0.8]],
    type: "surface",
    showscale: false,
    opacity: 0.35,
    colorscale: [[0, "#3b82f6"], [1, "#3b82f6"]],
    name: "Płaszczyzna PC1-PC2"
  };

  const initialCamera = {
    eye: { x: 1.6, y: 1.6, z: 1.2 }
  };

  const layout3D = {
    margin: { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      camera: initialCamera,
      xaxis: { title: "X", showgrid: true },
      yaxis: { title: "Y", showgrid: true },
      zaxis: { title: "Z", showgrid: true }
    },
    showlegend: false,
    paper_bgcolor: "transparent"
  };

  Plotly.newPlot("m4Plot3D", [tracePoints3D, tracePlane3D], layout3D, {
    responsive: true,
    displayModeBar: false
  });

  btnReset3D.addEventListener("click", function () {
    Plotly.relayout("m4Plot3D", { "scene.camera": initialCamera });
  });

  // 2. Scree Plot dla 8-wymiarowego zbioru cech
  const eigenValues8 = [4.32, 2.15, 0.78, 0.42, 0.21, 0.08, 0.03, 0.01];
  const totalVariance8 = eigenValues8.reduce((a, b) => a + b, 0);
  const indVarRatio = eigenValues8.map(v => (v / totalVariance8) * 100);

  const cumVarRatio = [];
  let runningSum = 0;
  for (const r of indVarRatio) {
    runningSum += r;
    cumVarRatio.push(runningSum);
  }

  const compLabels = ["PC1", "PC2", "PC3", "PC4", "PC5", "PC6", "PC7", "PC8"];

  function updateScree() {
    const threshold = parseInt(sliderThreshold.value, 10);
    valThreshold.textContent = `${threshold}%`;

    // Wyznaczenie liczby składowych k* spełniających próg
    let kStar = 1;
    for (let i = 0; i < cumVarRatio.length; i++) {
      if (cumVarRatio[i] >= threshold) {
        kStar = i + 1;
        break;
      }
    }

    badgeComponents.textContent = `k* = ${kStar} składowe (${cumVarRatio[kStar - 1].toFixed(1)}%)`;

    // Kolorowanie słupków: zaznaczone k* na granatowo, pozostałe na szaro
    const barColors = compLabels.map((_, idx) => (idx < kStar ? "#2563eb" : "#cbd5e1"));

    const traceBars = {
      x: compLabels,
      y: indVarRatio,
      type: "bar",
      name: "Wariancja Składowej (%)",
      marker: { color: barColors }
    };

    const traceLine = {
      x: compLabels,
      y: cumVarRatio,
      type: "scatter",
      mode: "lines+markers",
      name: "Skumulowana Wariancja (%)",
      line: { color: "#059669", width: 2.5 },
      marker: { size: 7, color: "#059669" }
    };

    const traceThreshold = {
      x: [compLabels[0], compLabels[compLabels.length - 1]],
      y: [threshold, threshold],
      type: "scatter",
      mode: "lines",
      name: "Próg Odcięcia",
      line: { color: "#e11d48", width: 1.8, dash: "dash" }
    };

    const layoutScree = {
      margin: { l: 40, r: 20, t: 15, b: 35 },
      xaxis: { title: "Główna Składowa", gridcolor: "#f1f5f9" },
      yaxis: { title: "Procent Wariancji (%)", range: [0, 105], gridcolor: "#f1f5f9" },
      showlegend: false,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent"
    };

    Plotly.react("m4PlotScree", [traceBars, traceLine, traceThreshold], layoutScree, {
      responsive: true,
      displayModeBar: false
    });
  }

  sliderThreshold.addEventListener("input", updateScree);
  updateScree();
}

/* ==========================================================================
   MODUŁ 5: Pułapki i Diagnostyka
   ========================================================================== */
function initModule5() {
  const btnToggleScale = document.getElementById("m5BtnToggleScale");
  const scaleStatusText = document.getElementById("m5ScaleStatusText");
  if (!btnToggleScale) return;

  let isScaled = true;
  btnToggleScale.addEventListener("click", function () {
    isScaled = !isScaled;
    if (isScaled) {
      btnToggleScale.textContent = "Przełącz: StandardScaler WŁĄCZONY";
      btnToggleScale.className = "px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors";
      scaleStatusText.innerHTML = "✅ <strong>StandardScaler aktywny:</strong> Obie cechy mają \(\mu=0, \sigma=1\). PCA widzi rzeczywistą korelację geometryczną między zmiennymi.";
      scaleStatusText.className = "text-[11px] text-emerald-800 font-medium bg-emerald-50 p-2.5 rounded border border-emerald-200";
    } else {
      btnToggleScale.textContent = "Przełącz: StandardScaler WYŁĄCZONY";
      btnToggleScale.className = "px-2.5 py-1 rounded bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors";
      scaleStatusText.innerHTML = "🚨 <strong>Brak skalowania:</strong> Cecha o skali w tysiącach (dochód) pochłania 99.8% wariancji! Wzrost został całkowicie zignorowany przez algorytm.";
      scaleStatusText.className = "text-[11px] text-rose-800 font-medium bg-rose-50 p-2.5 rounded border border-rose-200";
    }
  });
}

/* ==========================================================================
   MODUŁ 6: Sprawdzian Zrozumienia (Quiz Lyceum)
   ========================================================================== */
function initModule6() {
  const quizItems = document.querySelectorAll(".quiz-item");
  const scoreBadge = document.getElementById("quizScoreBadge");
  if (!quizItems.length) return;

  const answers = {
    "1": {
      correct: "B",
      explanation: "Zgodnie z twierdzeniem Pitagorasa: kwadrat odległości punktu od początku układu to suma kwadratu rzutu i kwadratu błędu rekonstrukcji. Ponieważ suma odległości oryginalnych punktów od środka jest stałą wartością zbioru danych, maksymalizacja wariancji rzutu musi jednocześnie minimalizować błąd MSE."
    },
    "2": {
      correct: "A",
      explanation: "Główne składowe powstają z ortogonalnych wektorów własnych symetrycznej macierzy kowariancji. W nowej bazie macierz kowariancji jest ściśle diagonalna, co oznacza, że kowariancja między dowolnymi dwiema różnymi składowymi (i ≠ j) wynosi dokładnie zero."
    },
    "3": {
      correct: "C",
      explanation: "PCA maksymalizuje bezwzględną wariancję numeryczną. Wariancja dochodu wyrażonego w złotówkach jest rzędu 10^8, podczas gdy wariancja wzrostu w metrach to ok. 0.01. Bez standaryzacji (Z-Score) algorytm przypisze wagę bliską 1.0 zarobkom, a cechę wzrostu potraktuje jak stałą zero."
    },
    "4": {
      correct: "A",
      explanation: "Jawne tworzenie macierzy X^T X podwaja wskaźnik uwarunkowania macierzy (condition number: κ(X^T X) = κ(X)^2). W arytmetyce IEEE 754 float64 oznacza to utratę połowy cyfr precyzji numerycznej i ryzyko niestabilności przy bliskich zeru wartościach własnych. SVD operuje bezpośrednio na X."
    },
    "5": {
      correct: "B",
      explanation: "PCA jest algorytmem całkowicie nienadzorowanym (unsupervised). Ignoruje etykiety klas y i szuka kierunków o największej ogólnej wariancji. Często największa wariancja wynika z technicznego szumu lub czynników niemających związku z klasyfikacją, podczas gdy subtelny sygnał decyzyjny kryje się w PC3 lub PC4."
    }
  };

  let totalScore = 0;
  const answered = new Set();

  quizItems.forEach(item => {
    const qNum = item.getAttribute("data-q");
    const buttons = item.querySelectorAll(".quiz-option-btn");
    const feedbackBox = item.querySelector(".feedback-box");

    buttons.forEach(btn => {
      btn.addEventListener("click", function () {
        if (answered.has(qNum)) return;
        answered.add(qNum);

        const chosenOpt = this.getAttribute("data-opt");
        const qData = answers[qNum];
        const isCorrect = chosenOpt === qData.correct;

        buttons.forEach(b => {
          b.disabled = true;
          const opt = b.getAttribute("data-opt");
          if (opt === qData.correct) {
            b.classList.add("correct");
          } else if (opt === chosenOpt && !isCorrect) {
            b.classList.add("incorrect");
          }
        });

        if (isCorrect) {
          totalScore++;
          feedbackBox.className = "feedback-box mt-3 p-3 rounded-lg text-xs leading-relaxed bg-emerald-50 border border-emerald-200 text-emerald-900";
          feedbackBox.innerHTML = `<strong>✅ Znakomicie!</strong> ${qData.explanation}`;
        } else {
          feedbackBox.className = "feedback-box mt-3 p-3 rounded-lg text-xs leading-relaxed bg-rose-50 border border-rose-200 text-rose-900";
          feedbackBox.innerHTML = `<strong>❌ Błędna odpowiedź.</strong> Poprawna opcja to <strong>${qData.correct}</strong>. ${qData.explanation}`;
        }
        feedbackBox.classList.remove("hidden");

        scoreBadge.textContent = `${totalScore} / 5`;
        if (totalScore === 5) {
          scoreBadge.className = "font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300";
        }
      });
    });
  });
}

/* ==========================================================================
   MODUŁ 7: Zakładki Kodu Pythona i Schowek
   ========================================================================== */
function initModule7() {
  const tabButtons = document.querySelectorAll(".code-tab-btn");
  const tabContents = document.querySelectorAll(".code-tab-content");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const copyIcon = document.getElementById("copyIcon");
  const copyLabel = document.getElementById("copyLabel");

  if (!tabButtons.length) return;

  let activeTab = "numpy-cov";

  tabButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      const target = this.getAttribute("data-tab");
      activeTab = target;

      tabButtons.forEach(b => {
        b.className = "code-tab-btn px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800";
      });
      this.className = "code-tab-btn px-4 py-2 text-xs font-bold border-b-2 border-blue-600 text-blue-600";

      tabContents.forEach(content => {
        if (content.id === `codeTab-${target}`) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      });
    });
  });

  if (btnCopyCode) {
    btnCopyCode.addEventListener("click", function () {
      const activeContent = document.getElementById(`codeTab-${activeTab}`);
      if (!activeContent) return;

      const codeText = activeContent.querySelector("code").innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        copyIcon.textContent = "✅";
        copyLabel.textContent = "Skopiowano!";
        setTimeout(() => {
          copyIcon.textContent = "📋";
          copyLabel.textContent = "Kopiuj aktywny skrypt";
        }, 2000);
      }).catch(err => {
        console.error("Błąd kopiowania:", err);
      });
    });
  }
}
