import type { SupabaseClient } from '@supabase/supabase-js'

/** Envía el código de recuperación (plantilla Reset Password de Supabase Auth con `{{ .Token }}`). */
export async function sendPasswordResetCode(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase())
  if (error) {
    throw new Error(
      error.status === 429
        ? 'Ya enviamos un código hace poco. Espera un minuto.'
        : 'No pudimos enviar el código. Intenta de nuevo.'
    )
  }
}

/** Valida el código de recuperación (abre sesión) y fija la contraseña nueva. */
export async function resetPasswordWithCode(
  client: SupabaseClient,
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const token = code.replace(/\D/g, '')
  if (token.length !== 6) throw new Error('El código tiene 6 dígitos.')
  if (newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')

  const { error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'recovery',
  })
  if (error) throw new Error('El código no es válido o ya venció.')

  const { error: updateError } = await client.auth.updateUser({ password: newPassword })
  if (updateError) {
    throw new Error(
      /same|different/i.test(updateError.message)
        ? 'Usa una contraseña distinta a la anterior.'
        : 'No pudimos cambiar la contraseña. Intenta de nuevo.'
    )
  }
}
