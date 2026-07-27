import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // PT-101 — Se compara contra `true`, no por veracidad. Con `!req.session?.isAdmin`, una
    // sesion con `isAdmin: 'false'` —la CADENA— abria el panel, porque una cadena no vacia es
    // verdadera. Hoy solo el login escribe esa sesion y escribe un booleano, asi que no era
    // explotable; pero esto es la frontera del contexto de mas privilegio del sistema y la
    // correccion cuesta una palabra. Lo encontro el test G-06.
    if (req.session?.isAdmin !== true) {
      res.redirect("/login");
      return false;
    }
    return true;
  }
}
