import { NotFoundException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { NotFoundExceptionFilter } from "../src/common/filters/not-found.filter";

/**
 * PT-101 (F-31) — El 404 del sitio público.
 *
 * BASE tampoco tenía dónde poner una prueba. F-31 hablaba sólo de ADMIN; al medir apareció que
 * BASE estaba igual, y dejarlo fuera habría repetido el patrón que esta serie viene corrigiendo:
 * arreglar donde se observó y no donde vive.
 *
 * La superficie de BASE es genuinamente delgada —4 ficheros—: casi todo su valor está en las
 * plantillas, que ya cubre `plantillas-sin-js-inline.spec.ts` (PT-096), y en el proxy, que es
 * configuración. Este filtro es la lógica que queda.
 *
 * Lo que se fija: que una ruta inexistente devuelva **404 con la página del sitio**, y no la
 * página de error del framework — que revela la pila y no se parece al producto.
 */
describe("NotFoundExceptionFilter (PT-101)", () => {
  let filtro: NotFoundExceptionFilter;
  let status: jest.Mock;
  let render: jest.Mock;

  const host = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({ getResponse: () => ({ status, render }) }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    filtro = new NotFoundExceptionFilter();
    render = jest.fn();
    status = jest.fn().mockReturnValue({ render });
  });

  it("F-01: responde 404, no 200 ni 500", () => {
    // Un 200 con página de «no encontrado» engaña a los buscadores y a cualquier cliente
    // automático; un 500 dice que el fallo es nuestro cuando no lo es.
    filtro.catch(new NotFoundException(), host());

    expect(status).toHaveBeenCalledWith(404);
  });

  it("F-02: pinta la página del sitio, no la del framework", () => {
    filtro.catch(new NotFoundException(), host());

    expect(render).toHaveBeenCalledWith("pages/404.html");
  });

  it("F-03: no filtra el mensaje de la excepción a la respuesta", () => {
    // El mensaje puede contener la ruta interna que se buscó. La página es estática a propósito.
    filtro.catch(new NotFoundException("No existe /interno/secreto"), host());

    expect(render).toHaveBeenCalledWith("pages/404.html");
    expect(JSON.stringify(render.mock.calls)).not.toContain("secreto");
  });
});
