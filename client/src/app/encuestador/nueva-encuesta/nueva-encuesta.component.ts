import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  Validators,
  FormBuilder,
  FormArray,
  FormControl,
} from '@angular/forms';
import Swal from 'sweetalert2';
import { CrudService } from '../../servicios/crud.service';
import { WebServiceService } from '../../servicios/web-service.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-nueva-encuesta',
  templateUrl: './nueva-encuesta.component.html',
  styleUrls: ['./nueva-encuesta.component.scss'],
})
export class NuevaEncuestaComponent implements OnInit {
  private url: string;

  constructor(
    private fb: FormBuilder,
    private crudService: CrudService,
    private servidor: WebServiceService,
    private http: HttpClient
  ) {
    this.url = servidor.obtenerUrl();
  }

  registerForm: FormGroup;
  parametros: any;
  numeroOpciones: any;
  user = [];

  ngOnInit() {
    this.getPersonas();

    this.createregisterForm();
    this.cargarParametros();
  }

  createregisterForm() {
    this.registerForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.pattern('^[A-Z]+[a-z]*$')]],
      encuestador: [
        '',
        [Validators.required, Validators.pattern('^[A-Z]+[a-z]*$')],
      ],
      grupoEncuestado: [
        '',
        [Validators.required, Validators.pattern('^[A-Z]+[a-z]*$')],
      ],
      encuestados: this.fb.array([]),
    });
  }

  cargarParametros() {
    Swal.mixin({
      input: 'number',
      confirmButtonText: 'Siguiente &rarr;',
      showCancelButton: true,
      progressSteps: ['1', '2'],
    })
      .queue(['Número de preguntas', 'Número de opciones por pregunta'])
      .then(async (result: any) => {
        if (result.value) {
          this.parametros = await result.value;
          Swal.fire({
            title: 'Su encuesta se esta creando!',
          }).then(() => {
            this.dibujarEncuesta();
          });
        }
      });
  }

  dibujarEncuesta() {
    let ubicacionEncuesta = document.querySelector('.setEncuesta'),
      contador: number = 0;

    // dibujar preguntas
    for (let i = 1; i <= parseInt(this.parametros[0]); i++) {
      let pregunta = document.createElement('div');
      // pregunta.id = 'pregunta' + i;
      pregunta.className = 'py-3 px-3 border-2';

      let title = document.createElement('span');
      let text = document.createTextNode('Pregunta' + ' ' + i);
      title.appendChild(text);

      let inputPregunta = document.createElement('input');
      inputPregunta.id = 'pregunta' + i;
      inputPregunta.type = 'text';
      inputPregunta.className = 'test py-2 px-2 border-2 w-64 bg-gray-300';
      inputPregunta.setAttribute('placeholder', 'Ingrese su pregunta aquí');

      pregunta.appendChild(title);
      pregunta.appendChild(inputPregunta);

      //dibujar opciones
      let opciones = document.createElement('div');
      opciones.className = 'py-2';

      for (let j = 1; j <= parseInt(this.parametros[1]); j++) {
        let opcion = document.createElement('input');

        opcion.id = (contador + 1).toString();
        opcion.type = 'text';
        opcion.className = 'py-2 px-2 border-2 bg-gray-200';

        contador = parseInt(opcion.id);
        this.numeroOpciones = contador;

        let title = document.createElement('span');
        let text = document.createTextNode('Opcion' + ' ' + j);
        title.appendChild(text);

        opciones.appendChild(title);
        opciones.appendChild(opcion);
        pregunta.appendChild(opciones);

        ubicacionEncuesta.insertAdjacentElement('beforeend', pregunta);
      }
      // console.log(pregunta);
    }
  }

  saveForm() {
    let formulario = {
        data: {
          titulo: this.registerForm.get('titulo').value,
          encuestador: this.registerForm.get('encuestador').value,
          grupoEncuestado: this.registerForm.get('grupoEncuestado').value,
          contenido: [],
          encuestados: this.registerForm.get('encuestados').value,
        },
      },
      pregunta: Array<any> = [],
      opciones: Array<any> = [],
      counter = 1,
      startValue = 0;

    for (let i = 1; i <= parseInt(this.parametros[0]); i++) {
      let preguntasValue = (<HTMLInputElement>(
        document.getElementById('pregunta' + i)
      )).value;

      let j = 1;

      while (j <= parseInt(this.parametros[1])) {
        let opcionValue = (<HTMLInputElement>(
          document.getElementById(counter.toString())
        )).value;

        opciones.push(opcionValue);

        counter++;
        j++;
      }

      if (startValue == 0) {
        pregunta.push({
          pregunta: preguntasValue,
          opciones: opciones.slice(startValue, parseInt(this.parametros[1])),
        });
      } else {
        pregunta.push({
          pregunta: preguntasValue,
          opciones: opciones.slice(startValue, this.numeroOpciones),
        });
      }

      startValue += parseInt(this.parametros[1]);
    }

    //console.log(pregunta)

    formulario.data.contenido = pregunta;

    //console.log(formulario)

    let encuestaGuardada = this.crudService.postData(
      formulario,
      'nuevaEncuesta'
    );
    if (encuestaGuardada) {
      console.log('encuestaGuardada');
      this.enviarCorreos();
      alert('correos enviados a los usuarios');
      //this.router.navigate(['/login']);
    } else {
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'no se enviaron los datos',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

  onChange(id: string, isChecked: boolean) {
    const encuestadosFormArray = <FormArray>(
      this.registerForm.controls.encuestados
    );

    if (isChecked) {
      encuestadosFormArray.push(new FormControl(id));
      // console.log('se agrego usuario');
    } else {
      let index = encuestadosFormArray.controls.findIndex((x) => x.value == id);
      encuestadosFormArray.removeAt(index);
      // console.log('se elimino usuario');
    }
  }

  // applyFilter(event: Event) {
  //   const filterValue = (event.target as HTMLInputElement).value;
  //   this.dataSource.filter = filterValue.trim().toLowerCase();
  // }
  getPersonas(): void {
    this.http
      .get(`${this.url}users`, this.servidor.obtenerHeaders())
      .subscribe((data: any) => {
        data.data.forEach((element) => {
          this.user.push(element);
          console.log(data.data);
        });
      });
  }

  enviarCorreos() {
    let correos: Array<any> = [],
      encuestados = this.registerForm.get('encuestados').value;

    this.user.forEach((user_element) => {
      encuestados.forEach((element) => {
        if (user_element._id == element) {
          correos.push(user_element.email);
        }
      });
    });

    let preparacionEnvio = {
      datos: {
        correos,
      },
    };

    //send server
    let enviarCorreos = this.crudService.postData(
      preparacionEnvio,
      'send_email'
    );
    if (enviarCorreos) {
      console.log('enviarCorreos');
      //this.router.navigate(['/login']);
    } else {
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'no se enviaron los datos',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }
}
