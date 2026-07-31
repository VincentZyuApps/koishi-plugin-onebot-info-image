import type { Context } from 'koishi'

export async function getGroupAvatarBase64(ctx: Context, groupId: string): Promise<string> {
  try {
    const groupAvatarUrl = `https://p.qlogo.cn/gh/${groupId}/${groupId}/640/`
    const response = await ctx.http.get(groupAvatarUrl, { responseType: 'arraybuffer' })
    return Buffer.from(response).toString('base64')
  } catch (error) {
    ctx.logger.warn(`获取群头像失败: ${error.message}`)
    return ''
  }
}

export async function getUserAvatarBase64(ctx: Context, userId: number | string): Promise<string> {
  try {
    const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640`
    const response = await ctx.http.get(avatarUrl, { responseType: 'arraybuffer' })
    return Buffer.from(response).toString('base64')
  } catch (error) {
    ctx.logger.warn(`获取用户 ${userId} 头像失败: ${error.message}`)
    return ''
  }
}

export async function getNoticeImageBase64(ctx: Context, imageId: string): Promise<string> {
  try {
    const imageUrl = `https://gdynamic.qpic.cn/gdynamic/${imageId}/0`
    const response = await ctx.http.get(imageUrl, { responseType: 'arraybuffer' })
    return Buffer.from(response).toString('base64')
  } catch (error) {
    ctx.logger.warn(`获取公告图片 ${imageId} 失败: ${error.message}`)
    return ''
  }
}
