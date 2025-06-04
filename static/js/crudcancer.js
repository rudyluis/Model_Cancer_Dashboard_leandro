$(document).ready(function () {
    cargarDatos();
    cargarOpcionesFormulario();

    $('#formAgregar').on('submit', agregarRegistro);
    $('#formEditar').on('submit', editarRegistro);
});

// Cargar datos en tabla
function cargarDatos() {
    $.ajax({
        url: "/api/list_cancer_records",
        method: "GET",
        dataType: "json",
        success: function (data) {
            $('#tablaDatos').DataTable().clear().destroy();
            $('#tablaDatos').DataTable({
                data: data,
                columns: [
                    { data: 'Patient_ID' },
                    { data: 'Age' },
                    { data: 'Gender' },
                    { data: 'Country' },
                    { data: 'Year' },
                    { data: 'Genetic_Risk' },
                    { data: 'Air_Pollution' },
                    { data: 'Alcohol_Use' },
                    { data: 'Smoking' },
                    { data: 'Obesity_Level' },
                    { data: 'Cancer_Type' },
                    { data: 'Cancer_Stage' },
                    { data: 'Treatment_Cost_USD' },
                    { data: 'Survival_Years' },
                    { data: 'Target_Severity_Score' },
                    {
                        data: null,
                        render: function (data) {
                            return `
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${data.Patient_ID}">✏️</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${data.Patient_ID}">🗑️</button>
                            `;
                        }
                    }
                ]
            });
        },
        error: function () {
            alert("Error al cargar los datos.");
        }
    });
}

// Cargar opciones para selects
function cargarOpcionesFormulario() {
    $.ajax({
        url: '/api/opciones',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            llenarCombo('#addGenero', data.generos);
            llenarCombo('#addPais', data.paises);
            llenarCombo('#addAnio', data.anios);
            llenarCombo('#addTipoCancer', data.tipos_cancer);
            llenarCombo('#editarGenero', data.generos);
            llenarCombo('#editarPais', data.paises);
            llenarCombo('#editarAnio', data.anios);
            llenarCombo('#editarTipoCancer', data.tipos_cancer);
        },
        error: function () {
            console.error("Error al cargar combos");
        }
    });
}

function llenarCombo(selector, valores) {
    const select = $(selector);
    select.empty();
    select.append('<option value="">-- Seleccione --</option>');
    valores.forEach(v => {
        select.append(`<option value="${v}">${v}</option>`);
    });
}

// Agregar
function agregarRegistro(e) {
    e.preventDefault();
    const datos = {
        patient_id: $('#inputIdPaciente').val(),
        age: parseInt($('#inputEdad').val()),
        gender: $('#addGenero').val() || "Other",
        country_region: $('#addPais').val(),
        year: parseInt($('#addAnio').val()),
        genetic_risk: parseFloat($('#inputGenetico').val()),
        air_pollution: parseFloat($('#inputAire').val()),
        alcohol_use: parseFloat($('#inputAlcohol').val()),
        smoking: parseFloat($('#inputTabaco').val()),
        obesity_level: parseFloat($('#inputObesidad').val()),
        cancer_type: $('#addTipoCancer').val(),
        cancer_stage: $('#inputEtapa').val(),
        treatment_cost_usd: parseFloat($('#inputCosto').val()),
        survival_years: parseFloat($('#inputSupervivencia').val()),
        target_severity_score: parseFloat($('#inputSeveridad').val())
    };

    $.ajax({
        url: '/add/cancer_data',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function () {
            $('#modalAgregar').modal('hide');
            $('#formAgregar')[0].reset();
            cargarDatos();
        },
        error: function () {
            alert('Error al guardar el caso de cáncer.');
        }
    });
}

// Editar: Cargar datos en el modal
$('#tablaDatos').on('click', '.btn-editar', function () {
    const id = $(this).data('id');

    $.get(`/api/get/cancer_data/${id}`, function (data) {
        $('#editarId').val(data.Patient_ID);
        $('#editarAge').val(data.Age);
        $('#editarGenero').val(data.Gender);
        $('#editarPais').val(data.Country);
        $('#editarAnio').val(data.Year);
        $('#editarGenetic').val(data.Genetic_Risk);
        $('#editarPollution').val(data.Air_Pollution);
        $('#editarAlcohol').val(data.Alcohol_Use);
        $('#editarSmoking').val(data.Smoking);
        $('#editarObesity').val(data.Obesity_Level);
        $('#editarTipoCancer').val(data.Cancer_Type);
        $('#editarStage').val(data.Cancer_Stage);
        $('#editarCost').val(data.Treatment_Cost_USD);
        $('#editarSurvival').val(data.Survival_Years);
        $('#editarSeverity').val(data.Target_Severity_Score);

        new bootstrap.Modal(document.getElementById('modalEditar')).show();
    });
});

// Guardar Edición
function editarRegistro(e) {
    e.preventDefault();
    const id = $('#editarId').val();

    const datos = {
        age: parseInt($('#editarAge').val()),
        gender: $('#editarGenero').val() || "Other",
        country_region: $('#editarPais').val(),
        year: parseInt($('#editarAnio').val()),
        genetic_risk: parseFloat($('#editarGenetic').val()),
        air_pollution: parseFloat($('#editarPollution').val()),
        alcohol_use: parseFloat($('#editarAlcohol').val()),
        smoking: parseFloat($('#editarSmoking').val()),
        obesity_level: parseFloat($('#editarObesity').val()),
        cancer_type: $('#editarTipoCancer').val(),
        cancer_stage: $('#editarStage').val(),
        treatment_cost_usd: parseFloat($('#editarCost').val()),
        survival_years: parseFloat($('#editarSurvival').val()),
        target_severity_score: parseFloat($('#editarSeverity').val())
    };

    $.ajax({
        url: `/upd/cancer_data/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(datos),
        success: function () {
            $('#modalEditar').modal('hide');
            cargarDatos();
        },
        error: function () {
            alert('Error al actualizar el registro.');
        }
    });
}

// Eliminar
$('#tablaDatos').on('click', '.btn-eliminar', function () {
    const id = $(this).data('id');
    if (confirm("¿Deseas eliminar este registro?")) {
        $.ajax({
            url: `/del/cancer_data/${id}`,
            method: 'DELETE',
            success: function () {
                cargarDatos();
            },
            error: function () {
                alert('Error al eliminar el registro.');
            }
        });
    }
});

$('#toggleTheme').on('click', function () {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
    this.textContent = isDark ? 'Modo Claro 🌞' : 'Modo Oscuro 🌙';
});