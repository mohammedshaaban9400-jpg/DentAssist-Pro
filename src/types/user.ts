export type UserRole = 'doctor' | 'receptionist'

export type DbUser = {
  id: number
  username: string
  role: UserRole
  mustChangePin?: boolean
}
