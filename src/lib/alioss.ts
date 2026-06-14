const OSS = require('ali-oss');

const client = new OSS({
    bucket:process.env.ALIYUN_OSS_BUCKET,
    // 填写Bucket所在地域
    region: process.env.ALIYUN_OSS_REGION,
    // 从环境变量中获取访问凭证
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    // 启用V4签名
    authorizationV4: true,
});

export default client;