# UsersModule - Documentación de Integración

## Descripción

El `UsersModule` gestiona los perfiles de usuario, verificación de cuenta y habilitación de vendedores. Es el complemento natural del `AuthModule` - mientras Auth maneja autenticación, Users maneja identidad post-login.

## Estructura de Archivos

```
src/modules/users/
├── __tests__/
│   ├── users.controller.spec.ts    # Tests del controller
│   └── users.service.spec.ts       # Tests del service
├── dto/
│   ├── index.ts                    # Barrel exports
│   ├── enable-seller.dto.ts        # DTO habilitación vendedor
│   ├── update-profile.dto.ts       # DTO actualización perfil
│   └── user-response.dto.ts        # DTOs de respuesta
├── index.ts                        # Barrel exports
├── users.controller.ts             # Endpoints REST
├── users.module.ts                 # Módulo NestJS
└── users.service.ts                # Lógica de negocio

src/modules/auth/guards/
└── optional-jwt-auth.guard.ts      # Guard para auth opcional
```

## Pasos de Integración

### 1. Actualizar Schema Prisma

Agregar al archivo `prisma/schema.prisma`:

```prisma
// En el modelo User, agregar relación:
model User {
  // ... campos existentes ...
  profile Profile?
}

// Agregar nuevo modelo:
model Profile {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  phone      String?  @db.VarChar(20)
  address    String?  @db.Text
  city       String?  @db.VarChar(100)
  country    String?  @db.VarChar(100)
  postalCode String?  @map("postal_code") @db.VarChar(20)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("profiles")
}
```

### 2. Ejecutar Migración

```bash
npx prisma migrate dev --name add_profile_model
npx prisma generate
```

### 3. Registrar en AppModule

```typescript
// src/app.module.ts
import { UsersModule } from '@/modules/users';

@Module({
  imports: [
    // ... otros módulos ...
    UsersModule,
  ],
})
export class AppModule {}
```

### 4. Exportar Guard en AuthModule

```typescript
// src/modules/auth/guards/index.ts
export * from './jwt-auth.guard';
export * from './optional-jwt-auth.guard';
```

```typescript
// src/modules/auth/auth.module.ts
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@Module({
  // ...
  providers: [
    // ... otros providers ...
    OptionalJwtAuthGuard,
  ],
  exports: [
    // ... otros exports ...
    OptionalJwtAuthGuard,
  ],
})
export class AuthModule {}
```

## Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Perfil propio completo | ✅ Requerido |
| PATCH | `/users/me` | Actualizar perfil | ✅ Requerido |
| GET | `/users/me/stats` | Estadísticas del usuario | ✅ Requerido |
| GET | `/users/me/verification-status` | Estado de verificación | ✅ Requerido |
| POST | `/users/me/resend-verification` | Reenviar email verificación | ✅ Requerido |
| POST | `/users/me/enable-seller` | Habilitar como vendedor | ✅ Requerido |
| GET | `/users/:id` | Perfil público de usuario | ⚪ Opcional |

## Reglas de Negocio

### Actualizar Perfil
- Usuario debe estar en estado `ACTIVE`
- Campos permitidos: displayName, avatarUrl, phone, address, city, country, postalCode

### Habilitar Vendedor
Requisitos:
- Estado `ACTIVE`
- Email verificado
- Display name configurado
- Dirección completa (address, city, country)
- Aceptar términos y condiciones

### Perfil Público
- Solo expone: id, displayName, avatarUrl, isSeller, estadísticas
- No visible para usuarios SUSPENDED o BANNED

## Ejemplos de Uso

### Obtener perfil propio
```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer <token>"
```

### Actualizar perfil
```bash
curl -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA"
  }'
```

### Habilitar vendedor
```bash
curl -X POST http://localhost:3000/users/me/enable-seller \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "acceptTerms": true,
    "businessName": "My Store"
  }'
```

## Tests

```bash
# Ejecutar tests del módulo
npm test -- --testPathPattern=users

# Con coverage
npm test -- --testPathPattern=users --coverage
```

## Dependencias

- `DatabaseModule` - Acceso a Prisma
- `AuditModule` - Registro de auditoría
- `AuthModule` - Guards de autenticación

## TODOs para Módulos Futuros

1. **NotificationsModule**: Implementar envío real de email de verificación
2. **AuctionsModule/RatingsModule**: Implementar cálculo real de estadísticas en `calculateUserStats()`
