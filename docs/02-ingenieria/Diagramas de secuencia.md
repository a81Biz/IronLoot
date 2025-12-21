## 0) Convenciones del modelo (para leer los diagramas)

* **UI**: Web/App (público, dashboards)
* **API**: Controladores de aplicación (sin framework)
* **Services**: lógica de negocio (casos de uso)
* **Repositories**: persistencia
* **Domain Entities**: modelos centrales (Auction, Bid, Order, Shipment, Dispute, Reputation, User)

---

# 1) Diagrama de clases (Dominio + Servicios)

```plantuml
@startuml
skinparam classAttributeIconSize 0

' ======= Domain Entities =======

class User {
  +uuid id
  +string email
  +string passwordHash
  +UserStatus status
  +VerificationLevel verificationLevel
  +bool sellerEnabled
  +datetime createdAt
  +datetime lastLoginAt
}

enum UserStatus { ACTIVE; SUSPENDED; BANNED }
enum VerificationLevel { NONE; BASIC; VERIFIED }

class Profile {
  +uuid userId
  +string displayName
  +string phone
  +string addressLine1
  +string addressLine2
  +string city
  +string country
  +string postalCode
}

class SellerProfile {
  +uuid userId
  +SellerStatus status
  +datetime enabledAt
}

enum SellerStatus { PENDING; ENABLED; DISABLED }

class Auction {
  +uuid id
  +uuid sellerUserId
  +string title
  +string description
  +AuctionStatus status
  +money startPrice
  +money currentPrice
  +money minIncrement
  +datetime startsAt
  +datetime endsAt
  +int softCloseWindowSec
  +datetime createdAt
}

enum AuctionStatus { DRAFT; ACTIVE; CLOSED; CANCELLED }

class AuctionItem {
  +uuid auctionId
  +string condition
  +string category
}

class AssetImage {
  +uuid id
  +uuid auctionId
  +string url
  +int sortOrder
}

class Bid {
  +uuid id
  +uuid auctionId
  +uuid bidderUserId
  +money amount
  +datetime placedAt
  +BidStatus status
}

enum BidStatus { ACCEPTED; REJECTED }

class WatchlistItem {
  +uuid id
  +uuid userId
  +uuid auctionId
  +datetime createdAt
}

class Order {
  +uuid id
  +uuid auctionId
  +uuid buyerUserId
  +uuid sellerUserId
  +money finalPrice
  +OrderStatus status
  +datetime createdAt
  +datetime expiresAt
}

enum OrderStatus { PAYMENT_PENDING; PAID; SHIPPING_PENDING; SHIPPED; DELIVERED; COMPLETED; CANCELLED }

class Payment {
  +uuid id
  +uuid orderId
  +money amount
  +PaymentStatus status
  +string providerRef
  +datetime createdAt
  +datetime confirmedAt
}

enum PaymentStatus { PENDING; CONFIRMED; FAILED; EXPIRED }

class Shipment {
  +uuid id
  +uuid orderId
  +ShipmentStatus status
  +string carrier
  +string trackingCode
  +datetime shippedAt
  +datetime deliveredAt
}

enum ShipmentStatus { NOT_SET; SHIPPED; DELIVERED }

class Rating {
  +uuid id
  +uuid orderId
  +uuid fromUserId
  +uuid toUserId
  +int stars
  +string comment
  +datetime createdAt
}

class ReputationSummary {
  +uuid userId
  +float avgStarsAsBuyer
  +float avgStarsAsSeller
  +int ratingCountAsBuyer
  +int ratingCountAsSeller
}

class Dispute {
  +uuid id
  +uuid orderId
  +uuid openedByUserId
  +DisputeStatus status
  +DisputeReason reason
  +string description
  +datetime openedAt
  +datetime resolvedAt
  +string resolutionNotes
}

enum DisputeStatus { OPEN; IN_NEGOTIATION; IN_MEDIATION; RESOLVED; CLOSED }
enum DisputeReason { NOT_RECEIVED; NOT_AS_DESCRIBED; PAYMENT_ISSUE; OTHER }

class Notification {
  +uuid id
  +uuid userId
  +NotificationType type
  +string title
  +string body
  +bool read
  +datetime createdAt
}

enum NotificationType { OUTBID; AUCTION_ENDING; AUCTION_WON; PAYMENT_DUE; PAYMENT_CONFIRMED; SHIPMENT_UPDATE; DISPUTE_UPDATE }

' ======= Relationships =======
User "1" -- "1" Profile
User "0..1" -- "1" SellerProfile
Auction "1" -- "1" AuctionItem
Auction "1" -- "*" AssetImage
Auction "1" -- "*" Bid
User "1" -- "*" Bid
User "1" -- "*" WatchlistItem
Auction "1" -- "*" WatchlistItem
Auction "1" -- "0..1" Order
Order "1" -- "0..1" Payment
Order "1" -- "0..1" Shipment
Order "1" -- "*" Rating
Order "1" -- "*" Dispute
User "1" -- "*" Notification

' ======= Application Services =======
class AuthService {
  +register(email, password, displayName): User
  +login(email, password): AuthSession
  +recoverAccess(email): void
}

class AuctionService {
  +listPublic(query, filters, sort): AuctionPage
  +getAuctionPublic(auctionId): AuctionDetail
  +createDraft(sellerId, payload): Auction
  +publish(auctionId, sellerId): Auction
  +closeIfExpired(auctionId): void
}

class BiddingService {
  +placeBid(auctionId, bidderId, amount): BidResult
  +validateBid(auction, bidder, amount): void
  +applySoftCloseIfNeeded(auction, now): Auction
}

class OrderService {
  +createOrderFromAuction(auctionId): Order
  +getBuyerOrders(buyerId): OrderPage
  +getSellerOrders(sellerId): OrderPage
  +markDelivered(orderId, buyerId): Order
}

class PaymentService {
  +initPayment(orderId, buyerId): PaymentIntent
  +confirmPayment(providerRef): Payment
  +expireOverduePayments(): void
}

class ShipmentService {
  +setShipment(orderId, sellerId, carrier, trackingCode): Shipment
  +markDelivered(orderId): Shipment
}

class RatingService {
  +submitRating(orderId, fromUserId, toUserId, stars, comment): Rating
  +getReputation(userId): ReputationSummary
}

class DisputeService {
  +openDispute(orderId, userId, reason, description): Dispute
  +postMessage(disputeId, userId, message): void
  +escalate(disputeId, userId): Dispute
  +resolve(disputeId, mediatorId, resolutionNotes): Dispute
}

@enduml
```

---

# 2) Secuencia: Registro + Login

```plantuml
@startuml
actor Visitor
boundary WebUI
control AuthController
control AuthService
control UserRepository
control SessionRepository

Visitor -> WebUI: Abre /register
Visitor -> WebUI: Submit RegisterForm(email,password,displayName)

WebUI -> AuthController: POST /auth/register {email,password,displayName}
AuthController -> AuthService: register(email,password,displayName)

AuthService -> UserRepository: existsByEmail(email)?
UserRepository --> AuthService: false

AuthService -> UserRepository: create(User{email,passwordHash,status=ACTIVE,verificationLevel=NONE})
UserRepository --> AuthService: userId

AuthService -> SessionRepository: createSession(userId)
SessionRepository --> AuthService: sessionToken

AuthService --> AuthController: AuthSession{userId,sessionToken}
AuthController --> WebUI: 201 + session
WebUI --> Visitor: Redirect /dashboard
@enduml
```

---

# 3) Secuencia: Explorar escaparate + ver detalle

```plantuml
@startuml
actor Visitor
boundary WebUI
control AuctionController
control AuctionService
control AuctionRepository
control BidRepository
control UserRepository
control RatingService

Visitor -> WebUI: Abre /auctions (escaparate)
WebUI -> AuctionController: GET /public/auctions?query&filters&sort
AuctionController -> AuctionService: listPublic(query,filters,sort)
AuctionService -> AuctionRepository: searchPublic(query,filters,sort)
AuctionRepository --> AuctionService: auctions[]
AuctionService --> AuctionController: AuctionPage{items,paging}
AuctionController --> WebUI: 200 AuctionPage

Visitor -> WebUI: Abre /auction/{id}
WebUI -> AuctionController: GET /public/auctions/{id}
AuctionController -> AuctionService: getAuctionPublic(auctionId)
AuctionService -> AuctionRepository: getById(auctionId)
AuctionRepository --> AuctionService: auction
AuctionService -> BidRepository: getVisibleHistory(auctionId)
BidRepository --> AuctionService: bidHistory[]
AuctionService -> RatingService: getReputation(auction.sellerUserId)
RatingService --> AuctionService: ReputationSummary
AuctionService --> AuctionController: AuctionDetail{auction,bidHistory,reputation}
AuctionController --> WebUI: 200 AuctionDetail
@enduml
```

---

# 4) Secuencia: Pujar + validación + soft-close + notificación

```plantuml
@startuml
actor Buyer as "Comprador (Verificado)"
boundary WebUI
control BiddingController
control BiddingService
control AuctionRepository
control BidRepository
control UserRepository
control NotificationService

Buyer -> WebUI: En detalle subasta, ingresa monto
WebUI -> BiddingController: POST /auctions/{id}/bids {amount}

BiddingController -> BiddingService: placeBid(auctionId,bidderId,amount)

BiddingService -> UserRepository: getById(bidderId)
UserRepository --> BiddingService: user(verificationLevel=VERIFIED)

BiddingService -> AuctionRepository: getForUpdate(auctionId)
AuctionRepository --> BiddingService: auction(status=ACTIVE,currentPrice,minIncrement,endsAt,softCloseWindowSec)

BiddingService -> BiddingService: validateBid(auction,user,amount)
note right: Validaciones\n- usuario VERIFIED\n- subasta ACTIVE\n- amount >= currentPrice + minIncrement\n- no bloqueos

BiddingService -> BidRepository: insert(Bid{auctionId,bidderId,amount,placedAt,ACCEPTED})
BidRepository --> BiddingService: bidId

BiddingService -> AuctionRepository: updateCurrentPrice(auctionId,amount)
BiddingService -> BiddingService: applySoftCloseIfNeeded(auction,now)
alt Puja dentro de ventana crítica
  BiddingService -> AuctionRepository: extendEndsAt(auctionId, now + softCloseWindowSec)
end

BiddingService -> NotificationService: notifyOutbidParticipants(auctionId, bidId)
NotificationService --> BiddingService: ok

BiddingService --> BiddingController: BidResult{accepted=true,newPrice,endsAt}
BiddingController --> WebUI: 200 BidResult
@enduml
```

---

# 5) Secuencia: Cierre automático + crear Order + notificar

```plantuml
@startuml
actor System as "Sistema (Scheduler)"
control AuctionService
control AuctionRepository
control BidRepository
control OrderService
control OrderRepository
control NotificationService

System -> AuctionService: closeIfExpired(auctionId)

AuctionService -> AuctionRepository: getForUpdate(auctionId)
AuctionRepository --> AuctionService: auction(status=ACTIVE, endsAt)

alt now >= endsAt
  AuctionService -> BidRepository: getTopBid(auctionId)
  BidRepository --> AuctionService: topBid (or null)

  AuctionService -> AuctionRepository: setStatusClosed(auctionId)
  alt topBid exists
    AuctionService -> OrderService: createOrderFromAuction(auctionId)
    OrderService -> OrderRepository: insert(Order{auctionId,buyerId=topBid.bidderId,sellerId=auction.sellerUserId,finalPrice=topBid.amount,status=PAYMENT_PENDING,expiresAt})
    OrderRepository --> OrderService: orderId
    OrderService --> AuctionService: order

    AuctionService -> NotificationService: notifyAuctionWon(buyerId, auctionId, orderId)
    AuctionService -> NotificationService: notifyAuctionSold(sellerId, auctionId, orderId)
  else no winner
    AuctionService -> NotificationService: notifyAuctionClosedNoWinner(sellerId, auctionId)
  end
end
@enduml
```

---

# 6) Secuencia: Pago (buyer) + confirmar pago

> Nota: aquí lo dejo **agnóstico** a proveedor (sin “escrow” fijo), tal como el documento maestro.

```plantuml
@startuml
actor Buyer as "Comprador"
boundary WebUI
control PaymentController
control OrderRepository
control PaymentService
control PaymentRepository
control NotificationService

Buyer -> WebUI: Abre Pagos Pendientes
WebUI -> PaymentController: GET /me/orders?status=PAYMENT_PENDING
PaymentController -> OrderRepository: findByBuyerAndStatus(buyerId,PAYMENT_PENDING)
OrderRepository --> PaymentController: orders[]
PaymentController --> WebUI: 200 orders[]

Buyer -> WebUI: Paga orden
WebUI -> PaymentController: POST /orders/{orderId}/pay
PaymentController -> PaymentService: initPayment(orderId,buyerId)

PaymentService -> OrderRepository: getForUpdate(orderId)
OrderRepository --> PaymentService: order(status=PAYMENT_PENDING,expiresAt)

alt order.expiresAt not passed
  PaymentService -> PaymentRepository: create(Payment{orderId,amount=order.finalPrice,status=PENDING})
  PaymentRepository --> PaymentService: payment(providerRef)
  PaymentService --> PaymentController: PaymentIntent{providerRef,amount}
  PaymentController --> WebUI: 200 PaymentIntent
else overdue
  PaymentService --> PaymentController: 409 PaymentExpired
end

== Confirmación proveedor (webhook / reconciliación) ==

PaymentController -> PaymentService: confirmPayment(providerRef)
PaymentService -> PaymentRepository: getByProviderRef(providerRef)
PaymentRepository --> PaymentService: payment

PaymentService -> PaymentRepository: setStatusConfirmed(paymentId)
PaymentService -> OrderRepository: setStatus(orderId,PAID -> SHIPPING_PENDING)
PaymentService -> NotificationService: notifyPaymentConfirmed(buyerId,sellerId,orderId)
@enduml
```

---

# 7) Secuencia: Vendedor registra envío + comprador confirma recepción

```plantuml
@startuml
actor Seller as "Vendedor"
actor Buyer as "Comprador"
boundary WebUI
control ShipmentController
control ShipmentService
control OrderRepository
control ShipmentRepository
control NotificationService

Seller -> WebUI: Abre Ventas (pendientes de envío)
WebUI -> ShipmentController: GET /seller/orders?status=SHIPPING_PENDING
ShipmentController -> OrderRepository: findBySellerAndStatus(sellerId,SHIPPING_PENDING)
OrderRepository --> ShipmentController: orders[]
ShipmentController --> WebUI: 200 orders[]

Seller -> WebUI: Registra envío(carrier,tracking)
WebUI -> ShipmentController: POST /orders/{orderId}/shipment {carrier,trackingCode}
ShipmentController -> ShipmentService: setShipment(orderId,sellerId,carrier,trackingCode)

ShipmentService -> OrderRepository: getForUpdate(orderId)
OrderRepository --> ShipmentService: order(status=SHIPPING_PENDING, sellerId)

ShipmentService -> ShipmentRepository: upsert(Shipment{orderId,carrier,trackingCode,status=SHIPPED,shippedAt})
ShipmentRepository --> ShipmentService: shipment

ShipmentService -> OrderRepository: setStatus(orderId,SHIPPED)
ShipmentService -> NotificationService: notifyShipmentUpdate(buyerId,orderId,tracking)
ShipmentService --> ShipmentController: shipment
ShipmentController --> WebUI: 200 shipment

== Comprador confirma recepción ==

Buyer -> WebUI: Confirma recepción
WebUI -> ShipmentController: POST /orders/{orderId}/confirm-received
ShipmentController -> ShipmentService: markDelivered(orderId,buyerId)

ShipmentService -> OrderRepository: getForUpdate(orderId)
OrderRepository --> ShipmentService: order(status=SHIPPED,buyerId)

ShipmentService -> ShipmentRepository: setDelivered(orderId,deliveredAt)
ShipmentService -> OrderRepository: setStatus(orderId,DELIVERED -> COMPLETED)
ShipmentService -> NotificationService: notifyDeliveryConfirmed(sellerId,orderId)
ShipmentService --> ShipmentController: ok
ShipmentController --> WebUI: 200
@enduml
```

---

# 8) Secuencia: Calificar (buyer/seller) + actualizar reputación

```plantuml
@startuml
actor Rater as "Usuario (califica)"
boundary WebUI
control RatingController
control RatingService
control OrderRepository
control RatingRepository
control ReputationRepository

Rater -> WebUI: Envía calificación(stars,comment)
WebUI -> RatingController: POST /orders/{orderId}/ratings {toUserId,stars,comment}

RatingController -> RatingService: submitRating(orderId,fromUserId,toUserId,stars,comment)

RatingService -> OrderRepository: getById(orderId)
OrderRepository --> RatingService: order(status=COMPLETED)

RatingService -> RatingRepository: existsByOrderAndFrom(orderId,fromUserId)?
RatingRepository --> RatingService: false

RatingService -> RatingRepository: insert(Rating{orderId,fromUserId,toUserId,stars,comment})
RatingRepository --> RatingService: ratingId

RatingService -> ReputationRepository: recalcForUser(toUserId)
ReputationRepository --> RatingService: ReputationSummary

RatingService --> RatingController: rating + reputation
RatingController --> WebUI: 201
@enduml
```

---

# 9) Secuencia: Disputa + negociación + escalamiento + mediación

```plantuml
@startuml
actor User as "Comprador/Vendedor"
actor Mediator as "Mediador"
boundary WebUI
control DisputeController
control DisputeService
control OrderRepository
control DisputeRepository
control NotificationService

User -> WebUI: Inicia disputa(reason,description)
WebUI -> DisputeController: POST /orders/{orderId}/disputes {reason,description}
DisputeController -> DisputeService: openDispute(orderId,userId,reason,description)

DisputeService -> OrderRepository: getById(orderId)
OrderRepository --> DisputeService: order

DisputeService -> DisputeRepository: insert(Dispute{orderId,openedBy,reason,status=OPEN})
DisputeRepository --> DisputeService: disputeId

DisputeService -> NotificationService: notifyDisputeOpened(otherParty,disputeId)
DisputeService --> DisputeController: dispute
DisputeController --> WebUI: 201 dispute

== Negociación ==
User -> WebUI: Envía mensaje
WebUI -> DisputeController: POST /disputes/{id}/messages {message}
DisputeController -> DisputeService: postMessage(disputeId,userId,message)
DisputeService -> DisputeRepository: appendMessage(disputeId,userId,message)
DisputeService -> NotificationService: notifyDisputeUpdate(otherParty)

== Escalamiento ==
User -> WebUI: Escalar a mediación
WebUI -> DisputeController: POST /disputes/{id}/escalate
DisputeController -> DisputeService: escalate(disputeId,userId)
DisputeService -> DisputeRepository: setStatus(disputeId,IN_MEDIATION)
DisputeService -> NotificationService: notifyDisputeMediation(otherParty)

== Resolución ==
Mediator -> DisputeController: POST /disputes/{id}/resolve {resolutionNotes}
DisputeController -> DisputeService: resolve(disputeId,mediatorId,resolutionNotes)
DisputeService -> DisputeRepository: setResolved(disputeId,resolutionNotes,resolvedAt,status=RESOLVED)
DisputeService -> NotificationService: notifyDisputeResolved(parties)
@enduml
```
