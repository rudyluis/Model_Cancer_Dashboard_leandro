from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from sqlalchemy.orm import sessionmaker
from models.base import engine
from models.model import Usuario, CancerRecord
from werkzeug.security import generate_password_hash, check_password_hash
import os
from flask import jsonify
app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Crear sesión SQLAlchemy
Session = sessionmaker(bind=engine)
db_session = Session()

# Setup de LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

@login_manager.user_loader
def load_user(user_id):
    return db_session.query(Usuario).get(int(user_id))

# Ruta principal
@app.route('/')
def home():
    return render_template('auth.html')


@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form['action']
        username = request.form['username']
        password = request.form['password']
        if action == 'register':
            if db_session.query(Usuario).filter(username == username).first():
                flash('El usuario ya existe','danger')
            else:
                new_user = Usuario(
                    username=username, 
                    password=generate_password_hash(password)
                )
                db_session.add(new_user)
                db_session.commit()
                flash('Usuario creado exitosamente','success')  
                return redirect(url_for('auth'))
        elif action == 'login':
            user = db_session.query(Usuario).filter(username == username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                flash('Sesión iniciada exitosamente','success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuario o contraseña incorrectos','danger')
                return redirect(url_for('auth'))
    return render_template('auth.html')  # Renderizamos el formulario

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username= current_user.username)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth'))

#### Creacion y llamada ala BD
@app.route('/api/list_cancer_records')
def api_list_cancer():
    print("API LLEGAMOS")
    records = db_session.query(CancerRecord).all()

    resultados = []
    for r in records:
        resultados.append({
            "Patient_ID": r.id,
            "Age": r.age,
            "Gender": r.gender,
            "Country": r.country_region,
            "Year": r.year,
            "Genetic_Risk": r.genetic_risk,
            "Air_Pollution": r.air_pollution,
            "Alcohol_Use": r.alcohol_use,
            "Smoking": r.smoking,
            "Obesity_Level": r.obesity_level,
            "Cancer_Type": r.cancer_type,
            "Cancer_Stage": r.cancer_stage,
            "Treatment_Cost_USD": r.treatment_cost_usd,
            "Survival_Years": r.survival_years,
            "Target_Severity_Score": r.target_severity_score
        })

    return jsonify(resultados)
@app.route('/api/filtros', methods=['GET'])
def obtener_filtros():
    paises = request.args.getlist('pais')
    generos = request.args.getlist('genero')
    anios = request.args.getlist('anio')
    tipos_cancer = request.args.getlist('tipo')

    query = db_session.query(CancerRecord)

    if paises:
        query = query.filter(CancerRecord.country.in_(paises))
    if generos:
        query = query.filter(CancerRecord.gender.in_(generos))
    if anios:
        query = query.filter(CancerRecord.year.in_(anios))
    if tipos_cancer:
        query = query.filter(CancerRecord.cancer_type.in_(tipos_cancer))

    data = query.all()

    lista_paises = sorted({r.country for r in data if r.country})
    lista_generos = sorted({r.gender for r in data if r.gender})
    lista_anios = sorted({r.year for r in data if r.year})
    lista_tipos = sorted({r.cancer_type for r in data if r.cancer_type})

    return jsonify({
        'paises': lista_paises,
        'generos': lista_generos,
        'anios': lista_anios,
        'tipos_cancer': lista_tipos
    })

@app.route('/listcancer')
@login_required
def list_cancer():
    return render_template('crud/list.html')
###### CRUD

@app.route('/api/list_cancer_records')
def api_list_cancer_records():
    data = db_session.query(CancerRecord).all()
    print(data)
    registros = []
    for r in data:
        registros.append({
            "id": r.id,
            "Age": r.age,
            "Gender": r.gender,
            "Country_Region": r.country_region,
            "Year": r.year,
            "Genetic_Risk": r.genetic_risk,
            "Air_Pollution": r.air_pollution,
            "Alcohol_Use": r.alcohol_use,
            "Smoking": r.smoking,
            "Obesity_Level": r.obesity_level,
            "Cancer_Type": r.cancer_type,
            "Cancer_Stage": r.cancer_stage,
            "Treatment_Cost_USD": r.treatment_cost_usd,
            "Survival_Years": r.survival_years,
            "Target_Severity_Score": r.target_severity_score
        })

    return jsonify(registros)

##para los combos de filtros
@app.route('/api/opciones', methods=['GET'])
def obtener_opciones():
    paises = db_session.query(CancerRecord.country_region).distinct().all()
    generos = db_session.query(CancerRecord.gender).distinct().all()
    anios = db_session.query(CancerRecord.year).distinct().all()
    tipos_cancer = db_session.query(CancerRecord.cancer_type).distinct().all()

    return jsonify({
        "paises": sorted([p[0] for p in paises if p[0]]),
        "generos": sorted([g[0] for g in generos if g[0]]),
        "anios": sorted([a[0] for a in anios if a[0]]),
        "tipos_cancer": sorted([t[0] for t in tipos_cancer if t[0]])
    })
#### Agregar regist
@app.route('/add/cancer_record', methods=['POST'])
def crear_cancer_record():
    data = request.json
    nuevo = CancerRecord(
        age=int(data.get('age')),
        gender=data.get('gender'),
        country=data.get('country'),
        year=int(data.get('year')),
        genetic_risk=float(data.get('genetic_risk')),
        air_pollution=float(data.get('air_pollution')),
        alcohol_use=float(data.get('alcohol_use')),
        smoking=float(data.get('smoking')),
        obesity_level=float(data.get('obesity_level')),
        cancer_type=data.get('cancer_type'),
        cancer_stage=data.get('cancer_stage'),
        treatment_cost_usd=float(data.get('treatment_cost_usd')),
        survival_years=float(data.get('survival_years')),
        target_severity_score=float(data.get('target_severity_score'))
    )
    db_session.add(nuevo)
    db_session.commit()
    return jsonify({"mensaje": "Registro de cáncer agregado correctamente"})


@app.route('/del/cancer_record/<int:id>', methods=['DELETE'])
def eliminar_cancer_record(id):
    registro = db_session.query(CancerRecord).get(id)
    if registro:
        db_session.delete(registro)
        db_session.commit()
        return jsonify({"mensaje": "Registro eliminado correctamente"})
    return jsonify({"error": "Registro no encontrado"}), 404



@app.route('/upd/cancer_record/<int:id>', methods=['PUT'])
def actualizar_cancer_record(id):
    data = request.json
    registro = db_session.query(CancerRecord).get(id)
    if not registro:
        return jsonify({"error": "Registro no encontrado"}), 404

    registro.age = int(data.get("age"))
    registro.gender = data.get("gender")
    registro.country = data.get("country")

    registro.year = int(data.get("year"))
    registro.genetic_risk = float(data.get("genetic_risk"))
    registro.air_pollution = float(data.get("air_pollution"))
    registro.alcohol_use = float(data.get("alcohol_use"))
    registro.smoking = float(data.get("smoking"))
    registro.obesity_level = float(data.get("obesity_level"))
    registro.cancer_type = data.get("cancer_type")
    registro.cancer_stage = data.get("cancer_stage")
    registro.treatment_cost_usd = float(data.get("treatment_cost_usd"))
    registro.survival_years = float(data.get("survival_years"))
    registro.target_severity_score = float(data.get("target_severity_score"))

    db_session.commit()
    return jsonify({"mensaje": "Registro actualizado correctamente"})





if __name__ == '__main__':
    app.run(debug=True)
