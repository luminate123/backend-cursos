import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import {
  CheckoutDto,
  RejectPaymentDto,
  QueryPaymentsDto,
  QueryRevenueDto,
} from './dto/checkout.dto';

@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // ─── Alumno ────────────────────────────────────────────────────────────────

  // Datos de cobro. Autenticado, no público: no hay razón para exponer las
  // cuentas de la empresa a cualquier visitante.
  @Get('payments/bank-info')
  getBankInfo() {
    return this.paymentsService.getBankInfo();
  }

  // Solicita la inscripción adjuntando el comprobante de pago.
  @Post('courses/:courseId/checkout')
  checkout(
    @Param('courseId') courseId: string,
    @Body() dto: CheckoutDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.paymentsService.checkout(courseId, userId, dto);
  }

  @Get('payments/my')
  getMyPayments(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getMyPayments(userId);
  }

  // El comprobante solo se sirve por URL temporal, al dueño o a un admin.
  @Get('payments/:id/receipt')
  getReceipt(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.paymentsService.getReceiptUrl(id, userId, role);
  }

  // ─── Revisión de comprobantes ──────────────────────────────────────────────
  // El dinero entra a la cuenta del instructor, así que es él quien confirma
  // que llegó: aprobar el comprobante es lo que da acceso al alumno. El admin
  // ve toda la academia y puede intervenir.

  // Cola completa. Solo admin: es la vista de supervisión.
  @Get('payments')
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  // Cola del instructor, acotada a sus programas por el id del token.
  @Get('instructor/payments')
  @Roles(Role.INSTRUCTOR)
  findMine(@Query() query: QueryPaymentsDto, @CurrentUser('sub') userId: string) {
    return this.paymentsService.findAll(query, userId);
  }

  // Confirmar o rechazar un cobro es exclusivo del instructor dueño del
  // programa: el dinero entra a su cuenta y solo él puede verificar que llegó.
  // El administrador supervisa en lectura, no interviene.
  @Patch('payments/:id/approve')
  @Roles(Role.INSTRUCTOR)
  approve(@Param('id') id: string, @CurrentUser('sub') reviewerId: string) {
    return this.paymentsService.approve(id, reviewerId);
  }

  @Patch('payments/:id/reject')
  @Roles(Role.INSTRUCTOR)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser('sub') reviewerId: string,
  ) {
    return this.paymentsService.reject(id, reviewerId, dto.reason);
  }

  // Vista general: cuánto ingresó por venta de programas, en toda la academia.
  @Get('admin/revenue')
  @Roles(Role.ADMIN)
  getRevenue(@Query() query: QueryRevenueDto) {
    return this.paymentsService.getRevenue(query);
  }

  // ─── Instructor ────────────────────────────────────────────────────────────

  // Los ingresos del propio instructor. El id sale del token, nunca de un
  // parámetro: un instructor no puede pedir la facturación de otro.
  @Get('instructor/revenue')
  @Roles(Role.INSTRUCTOR)
  getMyRevenue(@Query() query: QueryRevenueDto, @CurrentUser('sub') userId: string) {
    return this.paymentsService.getRevenue(query, userId);
  }
}
