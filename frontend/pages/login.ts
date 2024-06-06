import superagent from 'superagent'
import { } from '../lib/jquery'
import { UserService } from '../lib/user'
import { redirectTo } from '../lib/redirect'

export async function init() {
  const response = await superagent.post('/user/newToken').send({ token: '' })
  $('.page--login > p.token').text(response.text.trim())
  $(document).on('click', '.page--login button.submit', async () => {
    const pasteId = ($('.page--login .paste-id').val()?.toString() || '').trim()
    const { body } = await superagent.post('/user/login/luogu').send({ pasteId, token: '' })
    if (body.error) window.alert(body.error)
    else {
      UserService.token = body.token
      redirectTo('/')
    }
  })
}
