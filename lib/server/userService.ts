import { id } from '@instantdb/admin'
import { getAdminDb } from './instantAdmin'

export type UserRole = 'admin' | 'staff'

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type CreateUserPayload = {
  email: string
  name: string
  role: UserRole
}

export type UpdateUserPayload = {
  email?: string
  name?: string
  role?: UserRole
}

function now() {
  return new Date().toISOString()
}

export async function createUser(payload: CreateUserPayload): Promise<string> {
  const db = getAdminDb()
  const timestamp = now()
  const newId = id()

  // Check if user with email already exists
  const existing = await db.query({
    users: {
      $: {
        where: { email: payload.email },
      },
    },
  })

  if (existing.users && existing.users.length > 0) {
    throw new Error('Usuário com este email já existe')
  }

  await db.transact([
    db.tx.users[newId].update({
      email: payload.email,
      name: payload.name,
      role: payload.role,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ])

  return newId
}

export async function listUsers(): Promise<User[]> {
  console.log('[listUsers] Iniciando busca de usuários...')
  const db = getAdminDb()
  const res = await db.query({
    users: {},
  })

  const users = (res.users || []) as User[]
  console.log('[listUsers] Usuários encontrados no banco:', users.length)
  console.log('[listUsers] Emails dos usuários:', users.map(u => u.email).join(', '))
  
  // Sort manually by createdAt (newest first)
  const sorted = users.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    return dateB - dateA
  })
  
  console.log('[listUsers] Retornando', sorted.length, 'usuários ordenados')
  return sorted
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = getAdminDb()
  const res = await db.query({
    users: {
      $: {
        where: { id: userId },
      },
    },
  })

  if (!res.users || res.users.length === 0) {
    return null
  }

  return res.users[0] as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getAdminDb()
  const res = await db.query({
    users: {
      $: {
        where: { email },
      },
    },
  })

  if (!res.users || res.users.length === 0) {
    return null
  }

  return res.users[0] as User
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<void> {
  const db = getAdminDb()
  const timestamp = now()

  // If email is being updated, check for duplicates
  if (payload.email) {
    const existing = await db.query({
      users: {
        $: {
          where: { email: payload.email },
        },
      },
    })

    if (existing.users && existing.users.length > 0) {
      const otherUser = existing.users.find((u) => u.id !== userId)
      if (otherUser) {
        throw new Error('Usuário com este email já existe')
      }
    }
  }

  const updateData: any = {
    updatedAt: timestamp,
  }

  if (payload.email !== undefined) updateData.email = payload.email
  if (payload.name !== undefined) updateData.name = payload.name
  if (payload.role !== undefined) updateData.role = payload.role

  await db.transact([
    db.tx.users[userId].update(updateData),
  ])
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getAdminDb()
  await db.transact([
    db.tx.users[userId].delete(),
  ])
}
