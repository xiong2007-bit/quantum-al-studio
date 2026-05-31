import WebSocket from 'ws';

export class DerivApiService {
  private static async executeConfiguredCall(token: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
      let isAuthorized = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({ authorize: token }));
      });

      ws.on('message', (data: string) => {
        const response = JSON.parse(data);
        if (response.error) {
          ws.close();
          return reject(response.error);
        }

        if (response.msg_type === 'authorize') {
          isAuthorized = true;
          ws.send(JSON.stringify(request));
        } else {
          ws.close();
          resolve(response);
        }
      });

      ws.on('error', (err) => {
        reject(err);
      });
      
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
        reject(new Error('Deriv API timeout'));
      }, 10000);
    });
  }

  static async getAccount(token: string) {
    const res = await this.executeConfiguredCall(token, { get_settings: 1 });
    return res.get_settings;
  }

  static async getBalance(token: string) {
    const res = await this.executeConfiguredCall(token, { balance: 1, account: 'all' });
    return res.balance;
  }

  static async getProfile(token: string) {
    const res = await this.executeConfiguredCall(token, { get_settings: 1 });
    return res.get_settings;
  }

  static async getHistory(token: string) {
    const res = await this.executeConfiguredCall(token, { statement: 1, description: 1, limit: 50 });
    return res.statement;
  }

  static async getPositions(token: string) {
    const res = await this.executeConfiguredCall(token, { portfolio: 1 });
    return res.portfolio;
  }
}
