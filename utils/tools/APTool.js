import { AbstractTool } from './AbstractTool.js';

export class APTool extends AbstractTool {
  name = 'draw';

  parameters = {
    properties: {
      prompt: {
        type: 'string',
        description: 'draw prompt of StableDiffusion, prefer to be in English. should be many keywords split by comma.'
      }
    },
    required: []
  };

  description = 'Useful when you want to draw picture';

  func = async function (opts, e) {
    let { prompt } = opts;
    if (e.at === e.bot.uin) {
      e.at = null;
    }
    e.atBot = false;
    let ap;
    try {
      // 导入新的绘图插件
      const { aiht } = await import('../../../earth-k-plugin/apps/NovelAI-Painting.js');
      ap = new aiht();
    } catch (err) {
      return 'the user didn\'t install earth-k-plugin. suggest him to install';
    }
    try {
      // 构造消息
      e.msg = '#绘个图' + prompt;
      // 调用绘图方法
      await ap.huatu2(e);
      return 'draw success, picture has been sent.';
    } catch (err) {
      return 'draw failed due to unknown error';
    }
  };
}