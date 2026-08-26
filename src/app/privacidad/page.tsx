import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad | Inu - Sistema de Alertas e Inundaciones",
  description:
    "Política de Privacidad y directrices de tratamiento de datos personales de la aplicación Inu.",
};

export default function PrivacidadPage() {
  const lastUpdated = "5 de agosto de 2026";

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-800">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        {/* Header */}
        <div className="border-b border-zinc-100 pb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50"
            >
              ← Volver al Mapa
            </Link>
            <span className="text-xs text-zinc-400">
              Última actualización: {lastUpdated}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="mt-2 text-base text-zinc-500">
            Inu - Sistema de Alertas e Inundaciones
          </p>
        </div>

        {/* Content */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-600 sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              1. Introducción
            </h2>
            <p>
              En <strong>Inu</strong> (disponible en{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm font-mono text-zinc-800">
                inu-app.inu-bdc.workers.dev
              </code>
              ), valoramos y respetamos su privacidad. Esta Política de
              Privacidad describe cómo recopilamos, utilizamos, almacenamos y
              protegemos la información personal y los datos de localización que
              usted proporciona al interactuar con nuestra plataforma a través
              de la aplicación web y nuestro Bot de Telegram asociado.
            </p>
            <p>
              Al utilizar nuestros servicios, usted acepta la recopilación y el
              uso de información de acuerdo con esta política.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              2. Información que Recopilamos
            </h2>
            <p>
              Recopilamos únicamente los datos necesarios para brindar y mejorar
              el servicio de alerta ciudadana:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Datos de Identificación del Bot de Telegram:</strong>{" "}
                Identificador único de Telegram (Chat ID), nombre de usuario de
                Telegram (username) y nombre visible de perfil, para identificar
                de dónde proviene el reporte y posibilitar la comunicación sobre
                el estado del reporte.
              </li>
              <li>
                <strong>Datos de Localización Geográfica:</strong> Coordenadas
                GPS (latitud y longitud) enviadas voluntariamente por el usuario
                al realizar un reporte de incidente. Estos datos son
                indispensables para poder ubicar las alertas e inundaciones de
                manera precisa en el mapa público.
              </li>
              <li>
                <strong>Contenido del Reporte:</strong> Descripciones de texto,
                tipo de incidente (ej. inundación urbana, lluvias fuertes,
                granizo, anegamiento de vivienda) e información relacionada con
                el estado del clima en su zona.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              3. Uso de la Información
            </h2>
            <p>
              La información recopilada se utiliza exclusivamente para los
              siguientes fines:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Visualización en el Mapa de Alertas:</strong> Mostrar la
                ubicación y el tipo de los incidentes reportados en tiempo real
                en la plataforma web para que la comunidad y las autoridades
                (como Defensa Civil) estén al tanto de la situación en la
                provincia de Corrientes.
              </li>
              <li>
                <strong>Validación y Gestión de Emergencias:</strong> Validar
                los reportes en base a información climática de fuentes
                oficiales y clasificar el nivel de riesgo del incidente (Bajo,
                Medio, Alto, Crítico).
              </li>
              <li>
                <strong>Comunicación:</strong> Responder al usuario a través del
                bot para confirmar el estado de su reporte (ej. validado o
                desestimado).
              </li>
            </ul>
            <p className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl text-zinc-700 italic">
              <strong>Nota Importante:</strong> Inu no comercializa, alquila ni
              vende su información personal a terceros bajo ninguna
              circunstancia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              4. Almacenamiento y Seguridad de los Datos
            </h2>
            <p>
              Los datos se almacenan de manera segura utilizando infraestructura
              de base de datos cifrada provista por Supabase. Implementamos
              medidas de seguridad técnicas y organizativas para proteger su
              información contra accesos no autorizados, alteraciones,
              divulgación o destrucción.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              5. Instrucciones para la Eliminación de Datos (Data Deletion
              Instructions)
            </h2>
            <p>
              De conformidad con las directrices de privacidad de Meta y las
              regulaciones internacionales de protección de datos (como el
              RGPD), garantizamos a los usuarios el derecho de solicitar la
              eliminación completa de sus datos en cualquier momento.
            </p>
            <p>
              Si desea eliminar su información personal de nuestra base de datos
              (incluyendo reportes anteriores, coordenadas geográficas de sus
              alertas, nombre de usuario y Chat ID de Telegram), siga estos
              sencillos pasos:
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-3">
              <ol className="list-decimal pl-5 space-y-2 font-medium text-zinc-800">
                <li>
                  Envíe un correo electrónico a la dirección de soporte:{" "}
                  <a
                    href="mailto:contacto.inu.app@gmail.com"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    contacto.inu.app@gmail.com
                  </a>
                  .
                </li>
                <li>
                  Use como asunto del mensaje:{" "}
                  <span className="font-mono bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-900">
                    Eliminar datos personales - Inu
                  </span>
                  .
                </li>
                <li>
                  En el cuerpo del mensaje, indique el{" "}
                  <strong>nombre de usuario de Telegram</strong> o el{" "}
                  <strong>Chat ID</strong> utilizado al momento de enviar los
                  reportes.
                </li>
              </ol>
              <p className="text-xs text-zinc-500 pt-2">
                Una vez recibida la solicitud, procederemos a borrar de forma
                permanente sus registros y los reportes asociados de nuestros
                servidores en un plazo máximo de 48 horas hábiles, y le
                enviaremos una confirmación de la eliminación.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              6. Cambios a esta Política de Privacidad
            </h2>
            <p>
              Nos reservamos el derecho de actualizar esta Política de
              Privacidad en cualquier momento. Si realizamos modificaciones
              sustanciales, actualizaremos la fecha en la parte superior de esta
              página. Le recomendamos revisar este documento de manera periódica
              para estar informado sobre cómo protegemos su información.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              7. Información de Contacto
            </h2>
            <p>
              Si tiene dudas, sugerencias o comentarios acerca de esta Política
              de Privacidad, puede ponerse en contacto con nuestro equipo a
              través del correo electrónico:{" "}
              <a
                href="mailto:contacto.inu.app@gmail.com"
                className="text-blue-600 underline hover:text-blue-800"
              >
                contacto.inu.app@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Inu - Sistema de Alertas e Inundaciones.
          Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
