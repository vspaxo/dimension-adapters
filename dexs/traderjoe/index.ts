import * as sdk from "@defillama/sdk";
import { Chain } from "@defillama/sdk/build/general";
import { BreakdownAdapter, FetchOptions, FetchResultVolume } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getChainVolume, getUniqStartOfTodayTimestamp } from "../../helpers/getUniSubgraphVolume";
import { httpGet } from "../../utils/fetchURL";

const endpoints = {
  [CHAIN.AVAX]: sdk.graph.modifyEndpoint('9ZjERoA7jGANYNz1YNuFMBt11fK44krveEhzssJTWokM'),
  [CHAIN.BSC]: sdk.graph.modifyEndpoint('3VgCBQh13PseR81hPNAbKua3gD8b8r33LauKjVnMbSAs'),
  [CHAIN.ARBITRUM]: sdk.graph.modifyEndpoint('3jFnXqk6UXZyciPu5jfUuPR7kzGXPSndsLNrWXQ6xAxk'),
};
type TEndpoint = {
  [s: string | Chain]: string;
}
const endpointsV2: TEndpoint = {
  [CHAIN.AVAX]: sdk.graph.modifyEndpoint('6KD9JYCg2qa3TxNK3tLdhj5zuZTABoLLNcnUZXKG9vuH'),
  [CHAIN.ARBITRUM]: "https://barn.traderjoexyz.com/v1/dex/analytics/arbitrum?startTime=1672012800&aggregateBy=daily",
  [CHAIN.BSC]: "https://barn.traderjoexyz.com/v1/dex/analytics/binance?startTime=1677801600&aggregateBy=daily",
  [CHAIN.ETHEREUM]: "https://barn.traderjoexyz.com/v1/dex/analytics/ethereum?startTime=1695513600&aggregateBy=daily"
}

interface IVolume {
  timestamp: number;
  volumeUsd: number;
}
const fetchV2 = async (options: FetchOptions): Promise<FetchResultVolume> => {
  const dayTimestamp = getUniqStartOfTodayTimestamp(new Date(options.endTimestamp * 1000))
  const url = `https://api.traderjoexyz.dev/v1/dex/analytics/${mapChain(options.chain)}?startTime=${options.startTimestamp}&endTime=${options.endTimestamp}`
  const historicalVolume: IVolume[] = (await httpGet(url, { headers: {
    'x-traderjoe-api-key': process.env.TRADERJOE_API_KEY
  }}));
  const totalVolume = historicalVolume
    .filter(volItem => volItem.timestamp <= dayTimestamp)
    .reduce((acc, { volumeUsd }) => acc + Number(volumeUsd), 0)

  const dailyVolume = historicalVolume
    .find(dayItem => dayItem.timestamp === dayTimestamp)?.volumeUsd
  return {
    totalVolume: `${totalVolume}`,
    dailyVolume: dailyVolume !== undefined ? `${dailyVolume}` : undefined,
    timestamp: dayTimestamp,
  }
}
const mapChain = (chain: Chain): string => {
  if (chain === CHAIN.BSC) return "binance"
  return chain
}

const graphsV1 = getChainVolume({
  graphUrls: endpoints,
  totalVolume: {
    factory: "factories",
    field: "volumeUSD",
  },
  dailyVolume: {
    factory: "dayData",
    field: "volumeUSD",
    dateField: "date"
  },
});


const graphsV2 = getChainVolume({
  graphUrls: endpointsV2,
  totalVolume: {
    factory: "lbfactories",
    field: "volumeUSD",
  },
  dailyVolume: {
    factory: "traderJoeDayData",
    field: "volumeUSD",
    dateField: "date"
  },
});

const adapter: BreakdownAdapter = {
  version: 1,
  breakdown: {
    v1: {
      [CHAIN.AVAX]: {
        fetch: graphsV1(CHAIN.AVAX),
        start: 1628467200,
      },
      [CHAIN.BSC]: {
        fetch: graphsV1(CHAIN.BSC),
        start: 1664841600,
      },
      [CHAIN.ARBITRUM]: {
        fetch: graphsV1(CHAIN.ARBITRUM),
        start: 1664841600,
      },
    },
    v2: {
      [CHAIN.AVAX]: {
        fetch: graphsV2(CHAIN.AVAX),
        start: 1668556800
      },
      [CHAIN.ARBITRUM]: {
        fetch: fetchV2,
        start: 1672012800
      },
      [CHAIN.BSC]: {
        fetch: fetchV2,
        start: 1677801600
      },
      [CHAIN.ETHEREUM]: {
        fetch: fetchV2,
        start: 1695513600
      }
    }
  },
};

export default adapter;
