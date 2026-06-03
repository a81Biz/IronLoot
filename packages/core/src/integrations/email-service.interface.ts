export interface IEmailService {
  sendEmail(
    to: string,
    subject: string,
    template: string,
    data: Record<string, unknown>,
  ): Promise<void>;
}
