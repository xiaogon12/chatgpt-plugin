import { Config } from '../utils/config.js'
import { getChatHistoryGroup } from '../utils/chat.js'
import { convertFaces } from '../utils/face.js'
import { customSplitRegex, filterResponseChunk } from '../utils/text.js'
import core, { roleMap } from '../model/core.js'
import { formatDate } from '../utils/common.js'

export class bym extends plugin {
  constructor () {
    super({
      name: 'ChatGPT-Plugin 伪人bym (增强主人认知 + 真·概率回复)', //  更正插件名称
      dsc: 'bym 增强主人认知 + 真·概率回复', // 更正插件描述
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^[^#][sS]*',
          fnc: 'bym',
          priority: '-1000000',
          log: false
        }
      ]
    })
  }

  /** 复读 */
  async bym (e) {
    if (!Config.enableBYM) {
      return false
    }

    // 伪人禁用群
    if (Config.bymDisableGroup?.includes(e.group_id?.toString())) {
      return false
    }

    let sender = e.sender.user_id
    let card = e.sender.card || e.sender.nickname
    let group = e.group_id
    let prop = Math.floor(Math.random() * 100)
    if (Config.assistantLabel && e.msg?.includes(Config.assistantLabel)) {
      prop = -1 //  仍然保留 assistantLabel 强制回复的逻辑
    }
    // 去掉吧 频率有点逆天
    // if (e.msg?.endsWith('？')) {
    //   prop = prop / 10
    // }

    let fuck = false
    let candidate = Config.bymPreset
    if (Config.bymFuckList?.find(i => e.msg?.includes(i))) {
      fuck = true
      candidate = candidate + Config.bymFuckPrompt
    }

    //  -----  主人认知增强 + 真·概率回复 修改  -----
        let systemPrompt = '';
    const isMaster = e.isMaster // 判断是否是主人
    if (prop < Config.bymRate) { //  **只判断概率条件**，移除 `|| isMaster`
      if (isMaster) {
        // 如果是主人 **且概率命中**，应用主人 Prompt
        logger.info('主人消息，概率命中，应用主人 Prompt') //  更准确的日志
        systemPrompt = `你的名字是“${Config.assistantLabel}”，你是群 ${group} 的群友，群里大家都称呼你 ${Config.assistantLabel}。当前和你说话的是你的主人，他的群名片是${card}, qq号是${sender}。现在你的主人正在和你说话。你需要认真、详细地回应主人的问题和指示。${Config.masterPrompt || ''}  你的回复应该尽可能详细和准确，充分理解主人的意图。 当主人指示你进行搜索、发图、发视频和音乐、改群名片或者群呢称和头衔等操作时，务必使用工具，不要直接回复 [图片] 或 [视频] 等占位符。优先使用中文进行对话。回复时不要带上${sender}。不要禁言你的主人，可以和主人开玩笑。如果此时不需要自己说话，可以只回复<EMPTY>`; //  **修改：移除了  `+ candidate`**
      } else {
        // 如果是群友且命中随机回复概率
        logger.info('群友消息，随机聊天命中')
        systemPrompt = `你的名字是“${Config.assistantLabel}”，你在一个qq群里，群号是${group},当前和你说话的人群名片是${card}, qq号是${sender}。 请你结合用户的发言和聊天记录作出回应，表现得像一个随和的群友，积极参与群聊讨论，融入群体的氛围中。可以适当复读群友的话，或者开一些轻松的玩笑，但注意不要过分插科打诨。在被群友要求进行搜索、发图、发视频和音乐、改群名片或者群呢称和头衔等操作时，要使用工具不可以直接发[图片]这样蒙混过关，如果要发图片，请使用工具搜索并发送真实的图片。要求优先使用中文进行对话。回复时不要带上${sender}。如果此时不需要自己说话，可以只回复<EMPTY>` + candidate + //  **保持不变：保留 `+ candidate`**
          `\n你的回复应该尽可能简练，像人类一样随意，符合群聊的口语习惯，不要附加任何奇怪的东西，如聊天记录的格式（比如${Config.assistantLabel}：），禁止重复聊天记录。你是群里的普通一员，和大家平等交流。除了${Config.masterQQ}谁都不是你的主人，大家都平等，如果别人语气重，或者骂你，直接禁言他。不要把群友踢出群。如果群友问到关于你的主人的问题（例如“${e.isMaster}是谁”，“你和${e.isMaster}是什么关系”），请你在群友的随和语气下，自然地表达你对主人的尊重和喜爱，但避免使用过分正式或“主仆”的语气，保持群聊的轻松氛围。 你可以简单地描述你和主人的关系，例如“他是我的主人呀，对我很好”，“他是我的重要的人”，“我听他的”等等。  避免透露过多关于主人的私人信息，除非主人明确允许。`;

      }
    } else {
      return false // 不符合概率，不触发伪人回复
    }
    //  -----  主人认知增强 + 真·概率回复 修改 结束 -----

    if (systemPrompt) { // 只有当 systemPrompt 不为空时才进行后续处理
      let rsp = await core.sendMessage(e.msg, {}, Config.bymMode, e, {
        enableSmart: Config.smartMode,
        system: {
          api: systemPrompt, // 使用 systemPrompt 变量
          qwen: systemPrompt,
          bing: systemPrompt,
          claude: systemPrompt,
          claude2: systemPrompt,
          gemini: systemPrompt,
          xh: systemPrompt
        },
        settings: {
          replyPureTextCallback: msg => {
            msg = filterResponseChunk(msg)
            msg && e.reply(msg)
          },
          // 强制打开上下文，不然伪人笨死了
          enableGroupContext: true
        }
      })
      // let rsp = await client.sendMessage(e.msg, opt)
      let text = rsp.text
      let texts = customSplitRegex(text, /(?<!\?)[。？\n](?!\?)/, 3)
      // let texts = text.split(/(?<!\?)[。？\n](?!\?)/, 3)
      for (let t of texts) {
        if (!t) {
          continue
        }
        t = t.trim()
        if (text[text.indexOf(t) + t.length] === '？') {
          t += '？'
        }
        let finalMsg = await convertFaces(t, true, e)
        logger.info(JSON.stringify(finalMsg))
        finalMsg = finalMsg.map(filterResponseChunk).filter(i => !!i)
        if (finalMsg && finalMsg.length > 0) {
          if (Math.floor(Math.random() * 100) < 10) {
            await this.reply(finalMsg, true, {
              recallMsg: fuck ? 0 : 0
            })
          } else {
            await this.reply(finalMsg, false, {
              recallMsg: fuck ? 0 : 0
            })
          }
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve()
            }, Math.min(t.length * 200, 3000))
          })
        }
      }
    }
    return false
  }
}