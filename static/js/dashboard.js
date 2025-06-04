let allData = [];
let filteredData = [];

$(document).ready(function () {
  $('#filterPais, #filterGenero, #filterAnio, #filterTipoCancer').select2({
    placeholder: "Seleccionar...",
    allowClear: true,
    width: '100%',
    closeOnSelect: false,
    minimumResultsForSearch: 0,
    tags: false
  }).on('select2:select', function () {
    $(this).data('select2').$dropdown.find('.select2-search__field').focus();
  });

  $('#filterPais, #filterGenero, #filterAnio, #filterTipoCancer')
    .on('select2:unselecting', function (e) {
      $(this).data('prevent-open', true);
    })
    .on('select2:opening', function (e) {
      if ($(this).data('prevent-open')) {
        e.preventDefault();
        $(this).removeData('prevent-open');
      }
    });

  $.ajax({
    url: "/api/list_cancer_records",
    method: "GET",
    dataType: "json",
    success: function (data) {
      allData = data;
      filteredData = allData;
      popularFiltros();
      aplicarFiltrosYGraficos();
    },
    error: function (xhr, status, error) {
      console.error("Error al cargar los datos:", error);
    }
  });
});

function popularFiltros() {
  const paisSel = $('#filterPais').val();
  const generoSel = $('#filterGenero').val();
  const anioSel = $('#filterAnio').val();
  const tipoSel = $('#filterTipoCancer').val();

  const filtrado = allData.filter(d =>
    (!paisSel || d.Country_Region === paisSel) &&  // ⬅️ CORREGIDO
    (!generoSel || d.Gender === generoSel) &&
    (!anioSel || d.Year == anioSel) &&
    (!tipoSel || d.Cancer_Type === tipoSel)
  );

  const unique = (arr, key) => [...new Set(arr.map(d => d[key]).filter(Boolean))].sort();

  const actualizarCombo = (id, valores) => {
    const select = $(id);
    const valorActual = select.val();
    select.empty().append(`<option value="">Todos</option>`);
    valores.forEach(v => select.append(`<option value="${v}">${v}</option>`));
    if (valores.includes(valorActual)) select.val(valorActual);
  };

  actualizarCombo('#filterPais', unique(filtrado, 'Country'));  // ⬅️ CORREGIDO
  actualizarCombo('#filterGenero', unique(filtrado, 'Gender'));
  actualizarCombo('#filterAnio', unique(filtrado, 'Year'));
  actualizarCombo('#filterTipoCancer', unique(filtrado, 'Cancer_Type'));

  $('#filterPais, #filterGenero, #filterAnio, #filterTipoCancer').off('change').on('change', function () {
    popularFiltros();
    aplicarFiltrosYGraficos();
  });
}


function aplicarFiltrosYGraficos() {
  const pais = $('#filterPais').val();
  const genero = $('#filterGenero').val();
  const anio = $('#filterAnio').val();
  const tipoCancer = $('#filterTipoCancer').val();

  filteredData = allData.filter(d =>
    (!pais || d.Country === pais) &&  // ⬅️ CORREGIDO
    (!genero || d.Gender === genero) &&
    (!anio || d.Year == anio) &&
    (!tipoCancer || d.Cancer_Type === tipoCancer)
  );

  cargarTabla(filteredData);
  renderGraficos(filteredData); // ← puedes activarlo luego aquí
}

function cargarTabla(data) {
  const tabla = $('#tablaDatos').DataTable();
  tabla.clear().destroy();

  const cuerpo = data.map(d => [
    d.Patient_ID,
    parseInt(d.Age),
    d.Gender,
    d.Country,
    parseInt(d.Year),
    parseFloat(d.Genetic_Risk),
    parseFloat(d.Air_Pollution),
    parseFloat(d.Alcohol_Use),
    parseFloat(d.Smoking),
    parseFloat(d.Obesity_Level),
    d.Cancer_Type,
    d.Cancer_Stage,
    parseFloat(d.Treatment_Cost_USD),
    parseFloat(d.Survival_Years),
    parseFloat(d.Target_Severity_Score)
  ]);

  $('#tablaDatos').DataTable({
    data: cuerpo,
    columns: [
      { title: "ID Paciente" },
      { title: "Edad" },
      { title: "Género" },
      { title: "País" },
      { title: "Año" },
      { title: "Riesgo Genético" },
      { title: "Contaminación" },
      { title: "Consumo de Alcohol" },
      { title: "Consumo de Tabaco" },
      { title: "Nivel de Obesidad" },
      { title: "Tipo de Cáncer" },
      { title: "Etapa" },
      {
        title: "Costo Tratamiento (USD)",
        className: "text-end",
        render: data => `$${parseFloat(data).toFixed(2)}`
      },
      {
        title: "Años de Supervivencia",
        className: "text-end",
        render: data => parseFloat(data).toFixed(1)
      },
      {
        title: "Severidad",
        className: "text-end",
        render: data => parseFloat(data).toFixed(2)
      }
    ],
    responsive: true
  });
}

function renderGraficos(data) {
  // Destruir gráficos existentes
  const chartIds = [
    'casosPorPais',
    'casosPorTipoCancer',
    'graficoFactorAlcohol',
    'graficoFactorTabaco',
    'graficoFactorObesidad',
    'graficoFactorContaminacion',
    'graficoRadarFactoresRiesgo',
    'graficoCostosPorTipo',
    'graficoCostosPorEtapa',
    'graficoSeveridadSobrevida',
    'graficoDistribucionEdad',
    'graficoDistribucionGenero',
    'graficoDistribucionSeveridad'
  ];
  

  chartIds.forEach(id => {
    const chartInstance = Chart.getChart(id);
    if (chartInstance) {
      chartInstance.destroy();
    }
  });

  // Inicializar estructuras de datos
  const casosPais = {}, casosTipo = {}, casosAnio = {}, etapas = {};
  const factoresRiesgo = {
    Alcohol_Use: 0,
    Smoking: 0,
    Obesity_Level: 0,
    Air_Pollution: 0,
    Genetic_Risk: 0,
    count: 0
  };
  const puntosScatter = [];
  const costosPorTipo = {};
  const costosPorEtapa = {};

  // Procesar datos
  data.forEach(d => {
    const pais = d.Country;
    const tipo = d.Cancer_Type;
    const anio = d.Year;
    const etapa = d.Cancer_Stage;
    const costo = parseFloat(d.Treatment_Cost_USD);

    casosPais[pais] = (casosPais[pais] || 0) + 1;
    casosTipo[tipo] = (casosTipo[tipo] || 0) + 1;
    casosAnio[anio] = (casosAnio[anio] || 0) + 1;
    etapas[etapa] = (etapas[etapa] || 0) + 1;

    factoresRiesgo.Alcohol_Use += parseFloat(d.Alcohol_Use || 0);
    factoresRiesgo.Smoking += parseFloat(d.Smoking || 0);
    factoresRiesgo.Obesity_Level += parseFloat(d.Obesity_Level || 0);
    factoresRiesgo.Air_Pollution += parseFloat(d.Air_Pollution || 0);
    factoresRiesgo.Genetic_Risk += parseFloat(d.Genetic_Risk || 0);
    factoresRiesgo.count++;

    puntosScatter.push({
      x: parseFloat(d.Target_Severity_Score),
      y: parseFloat(d.Survival_Years)
    });

    if (!isNaN(costo)) {
      if (!costosPorTipo[tipo]) costosPorTipo[tipo] = [];
      costosPorTipo[tipo].push(costo);

      if (!costosPorEtapa[etapa]) costosPorEtapa[etapa] = [];
      costosPorEtapa[etapa].push(costo);
    }
  });

  const total = factoresRiesgo.count || 1;
  const radarLabels = ['Alcohol', 'Tabaco', 'Obesidad', 'Contaminación', 'Riesgo Genético'];
  const radarValues = [
    factoresRiesgo.Alcohol_Use / total,
    factoresRiesgo.Smoking / total,
    factoresRiesgo.Obesity_Level / total,
    factoresRiesgo.Air_Pollution / total,
    factoresRiesgo.Genetic_Risk / total
  ];

  // Gráfico de barras - casos por país
  new Chart(document.getElementById('casosPorPais'), {
    type: 'bar',
    data: {
      labels: Object.keys(casosPais),
      datasets: [{
        label: 'Casos por país',
        data: Object.values(casosPais),
        backgroundColor: ['#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688',
          '#00897B', '#00796B', '#00695C', '#004D40', '#00332C']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Casos por país'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 4700
        }
      }
    }
  });

  // Gráfico de barras - casos por tipo de cáncer
  new Chart(document.getElementById('casosPorTipoCancer'), {
    type: 'bar',
    data: {
      labels: Object.keys(casosTipo),
      datasets: [{
        label: 'Casos por tipo de cáncer',
        data: Object.values(casosTipo),
        backgroundColor: ['#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688',
          '#00897B', '#00796B', '#00695C', '#004D40', '#00332C'],
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Casos por tipo de cáncer',
          font: { size: 18 }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(2);
              return `${context.label}: ${value} casos (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 5800,
          title: {
            display: true,
            text: 'Cantidad de casos'
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
  // Gráfico de dispersión - Alcohol vs Supervivencia
  const puntosAlcohol = data.map(d => ({
    x: parseFloat(d.Alcohol_Use),
    y: parseFloat(d.Target_Severity_Score)
  })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  
  new Chart(document.getElementById('graficoFactorAlcohol'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Alcohol vs Severidad',
        data: puntosAlcohol,
        backgroundColor: '#FF7043'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Alcohol vs Puntaje de Severidad'
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Consumo de Alcohol' }
        },
        y: {
          title: { display: true, text: 'Puntaje de Severidad' }
        }
      }
    }
  });
  

  // Gráfico de dispersión - Tabaco vs Supervivencia
  const puntosTabaco = data.map(d => ({
    x: parseFloat(d.Smoking),
    y: parseFloat(d.Target_Severity_Score)
  })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  
  new Chart(document.getElementById('graficoFactorTabaco'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Tabaco vs Severidad',
        data: puntosTabaco,
        backgroundColor: '#8D6E63'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Tabaco vs Puntaje de Severidad'
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Consumo de Tabaco' }
        },
        y: {
          title: { display: true, text: 'Puntaje de Severidad' }
        }
      }
    }
  });
  

  // Gráfico de dispersión - Obesidad vs Supervivencia
  const puntosObesidad = data.map(d => ({
    x: parseFloat(d.Obesity_Level),
    y: parseFloat(d.Target_Severity_Score)
  })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  
  new Chart(document.getElementById('graficoFactorObesidad'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Obesidad vs Severidad',
        data: puntosObesidad,
        backgroundColor: '#4DB6AC'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Obesidad vs Puntaje de Severidad'
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Nivel de Obesidad' }
        },
        y: {
          title: { display: true, text: 'Puntaje de Severidad' }
        }
      }
    }
  });
  const puntosContaminacion = data.map(d => ({
    x: parseFloat(d.Air_Pollution),
    y: parseFloat(d.Target_Severity_Score)
  })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  
  new Chart(document.getElementById('graficoFactorContaminacion'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Contaminación vs Severidad',
        data: puntosContaminacion,
        backgroundColor: '#7986CB'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Contaminación vs Puntaje de Severidad'
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Contaminación en el aire' }
        },
        y: {
          title: { display: true, text: 'Puntaje de Severidad' }
        }
      }
    }
  });  


// Radar con cálculo real de promedios por variable
const valoresAlcohol = [], valoresTabaco = [], valoresObesidad = [], valoresContaminacion = [], valoresGenetico = [];

data.forEach(d => {
  const a = parseFloat(d.Alcohol_Use);
  const t = parseFloat(d.Smoking);
  const o = parseFloat(d.Obesity_Level);
  const c = parseFloat(d.Air_Pollution);
  const g = parseFloat(d.Genetic_Risk);

  if (!isNaN(a)) valoresAlcohol.push(a);
  if (!isNaN(t)) valoresTabaco.push(t);
  if (!isNaN(o)) valoresObesidad.push(o);
  if (!isNaN(c)) valoresContaminacion.push(c);
  if (!isNaN(g)) valoresGenetico.push(g);
});

const promedio = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

const radarData = {
  'Alcoholismo': promedio(valoresAlcohol),
  'Tabaquismo': promedio(valoresTabaco),
  'Obesidad': promedio(valoresObesidad),
  'Contaminación': promedio(valoresContaminacion),
  'Riesgo Genético': promedio(valoresGenetico)
};
new Chart(document.getElementById('graficoRadarFactoresRiesgo'), {
  type: 'radar',
  data: {
    labels: Object.keys(radarData),
    datasets: [{
      label: 'Promedio por Factor',
      data: Object.values(radarData),
      backgroundColor: 'rgb(255, 255, 153)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Promedio de Factores de Riesgo',
        font: {
          size: 18
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2
        }
      }
    }
  }
});
// 🎯 Definir rangos de costo reales
const rangosCosto = [
  { label: '5K–25K', min: 5000, max: 25000 },
  { label: '25K–50K', min: 25001, max: 50000 },
  { label: '50K–75K', min: 50001, max: 75000 },
  { label: '75K–100K', min: 75001, max: 100000 }
];

// 🎯 Colores consistentes por rango
const colorPorRango = {
  '5K–25K': '#AED581',
  '25K–50K': '#FFF176',
  '50K–75K': '#FFB74D',
  '75K–100K': '#E57373'
};

// ✅ Tipos
const tiposUnicos = [...new Set(data.map(d => d.Cancer_Type).filter(Boolean))];
const conteoPorTipoYRango = {};
tiposUnicos.forEach(tipo => {
  conteoPorTipoYRango[tipo] = {};
  rangosCosto.forEach(r => conteoPorTipoYRango[tipo][r.label] = 0);
});

data.forEach(d => {
  const tipo = d.Cancer_Type;
  const costo = parseFloat(d.Treatment_Cost_USD);
  if (!tipo || isNaN(costo)) return;
  for (const r of rangosCosto) {
    if (costo >= r.min && costo <= r.max) {
      conteoPorTipoYRango[tipo][r.label]++;
      break;
    }
  }
});

const datasetsTipo = rangosCosto.map(r => ({
  label: r.label,
  data: tiposUnicos.map(tipo => conteoPorTipoYRango[tipo][r.label]),
  backgroundColor: colorPorRango[r.label]
}));

new Chart(document.getElementById('graficoCostosPorTipo'), {
  type: 'bar',
  data: {
    labels: tiposUnicos,
    datasets: datasetsTipo
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Distribución de Costos por Tipo de Cáncer (Rangos)'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      },
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Cantidad de Pacientes' }
      },
      x: {
        title: { display: true, text: 'Tipo de Cáncer' }
      }
    }
  }
});

// ✅ Etapas
const etapasUnicas = [...new Set(data.map(d => d.Cancer_Stage).filter(Boolean))];
const conteoPorEtapaYRango = {};
etapasUnicas.forEach(etapa => {
  conteoPorEtapaYRango[etapa] = {};
  rangosCosto.forEach(r => conteoPorEtapaYRango[etapa][r.label] = 0);
});

data.forEach(d => {
  const etapa = d.Cancer_Stage;
  const costo = parseFloat(d.Treatment_Cost_USD);
  if (!etapa || isNaN(costo)) return;
  for (const r of rangosCosto) {
    if (costo >= r.min && costo <= r.max) {
      conteoPorEtapaYRango[etapa][r.label]++;
      break;
    }
  }
});

const datasetsEtapa = rangosCosto.map(r => ({
  label: r.label,
  data: etapasUnicas.map(etapa => conteoPorEtapaYRango[etapa][r.label]),
  backgroundColor: colorPorRango[r.label]
}));

new Chart(document.getElementById('graficoCostosPorEtapa'), {
  type: 'bar',
  data: {
    labels: etapasUnicas,
    datasets: datasetsEtapa
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Distribución de Costos por Etapa del Cáncer (Rangos)'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      },
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Cantidad de Pacientes' }
      },
      x: {
        title: { display: true, text: 'Etapa del Cáncer' }
      }
    }
  }
});


// ⏳ Gráfico de dispersión - Severidad vs Años de Supervivencia
const puntosSeveridad = data.map(d => {
  const severidad = parseFloat(d.Target_Severity_Score);
  const anios = parseFloat(d.Survival_Years);
  return { x: severidad, y: anios };
}).filter(p => !isNaN(p.x) && !isNaN(p.y));

new Chart(document.getElementById('graficoSeveridadSobrevida'), {
  type: 'scatter',
  data: {
    datasets: [{
      label: 'Severidad vs Años de Supervivencia',
      data: puntosSeveridad,
      backgroundColor: 'rgba(255, 99, 132, 0.7)',
      pointRadius: 5
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Relación entre Severidad y Supervivencia'
      },
      tooltip: {
        callbacks: {
          label: context => `Severidad: ${context.raw.x}, Años: ${context.raw.y}`
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Puntaje de Severidad' },
        min: 0,
        max: 10
      },
      y: {
        title: { display: true, text: 'Años de Supervivencia' },
        beginAtZero: true
      }
    }
  }
});

// 🎂 Gráfico de pastel - Distribución por rangos de edad
const rangosEdad = {
  '0-19': 0,
  '20-39': 0,
  '40-59': 0,
  '60-79': 0,
  '80+': 0
};

data.forEach(d => {
  const edad = parseInt(d.Age);
  if (!isNaN(edad)) {
    if (edad <= 19) rangosEdad['0-19']++;
    else if (edad <= 39) rangosEdad['20-39']++;
    else if (edad <= 59) rangosEdad['40-59']++;
    else if (edad <= 79) rangosEdad['60-79']++;
    else rangosEdad['80+']++;
  }
});

new Chart(document.getElementById('graficoDistribucionEdad'), {
  type: 'pie',
  data: {
    labels: Object.keys(rangosEdad),
    datasets: [{
      label: 'Distribución por Edad',
      data: Object.values(rangosEdad),
      backgroundColor: [
        '#B2EBF2', '#80DEEA', '#4DD0E1',
        '#26C6DA', '#00BCD4'
      ],
      borderColor: '#fff',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Distribución de Pacientes por Rango de Edad'
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.raw;
            const percent = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} pacientes (${percent}%)`;
          }
        }
      }
    }
  }
});
// 🎯 Gráfico de pastel - Distribución por Severidad (0-10)
const rangosSeveridad = {
  '0-2': 0,
  '3-4': 0,
  '5-6': 0,
  '7-8': 0,
  '9-10': 0
};

data.forEach(d => {
  const s = parseFloat(d.Target_Severity_Score);
  if (!isNaN(s)) {
    if (s <= 2) rangosSeveridad['0-2']++;
    else if (s <= 4) rangosSeveridad['3-4']++;
    else if (s <= 6) rangosSeveridad['5-6']++;
    else if (s <= 8) rangosSeveridad['7-8']++;
    else rangosSeveridad['9-10']++;
  }
});

new Chart(document.getElementById('graficoDistribucionSeveridad'), {
  type: 'pie',
  data: {
    labels: Object.keys(rangosSeveridad),
    datasets: [{
      label: 'Distribución por Severidad',
      data: Object.values(rangosSeveridad),
      backgroundColor: ['#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#D32F2F'],
      borderColor: '#fff',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Distribución por Rangos de Severidad'
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.raw;
            const percent = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} casos (${percent}%)`;
          }
        }
      }
    }
  }
});
// 👥 Gráfico de pastel - Distribución por Género
const generoContador = {};

data.forEach(d => {
  const genero = d.Gender?.trim();
  if (genero) {
    generoContador[genero] = (generoContador[genero] || 0) + 1;
  }
});

new Chart(document.getElementById('graficoDistribucionGenero'), {
  type: 'pie',
  data: {
    labels: Object.keys(generoContador),
    datasets: [{
      label: 'Distribución por Género',
      data: Object.values(generoContador),
      backgroundColor: ['#64B5F6', '#F06292', '#A1887F'],
      borderColor: '#fff',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Distribución de Género de Pacientes'
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.raw;
            const percent = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} pacientes (${percent}%)`;
          }
        }
      }
    }
  }
});

}

$('#toggleTheme').on('click', function () {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
    this.textContent = isDark ? 'Modo Claro 🌞' : 'Modo Oscuro 🌙';
});