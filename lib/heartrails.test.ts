import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeartRailsApiError, fetchLines, fetchStationGeo, fetchStations } from "./heartrails";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchLines", () => {
  it("複数路線を重複除去・五十音順で返す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ response: { line: ["JR山手線", "JR山手線", "都営三田線"] } }),
    );
    expect(await fetchLines("東京都")).toEqual(["JR山手線", "都営三田線"]);
  });

  it("レスポンスが単一要素(配列でない)でも配列として扱う", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: { line: "JR山手線" } }));
    expect(await fetchLines("東京都")).toEqual(["JR山手線"]);
  });

  it("HeartRailsがerrorを返した場合は空配列", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: { error: "not found" } }));
    expect(await fetchLines("存在しない県")).toEqual([]);
  });

  it("fetch自体が失敗(ネットワークエラー)した場合はHeartRailsApiErrorをthrowする", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(fetchLines("東京都")).rejects.toThrow(HeartRailsApiError);
  });

  it("HTTPエラーステータスの場合はHeartRailsApiErrorをthrowする", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 500));
    await expect(fetchLines("東京都")).rejects.toThrow(HeartRailsApiError);
  });

  it("レスポンスのJSON解析に失敗した場合はHeartRailsApiErrorをthrowする", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("invalid json")),
    } as unknown as Response);
    await expect(fetchLines("東京都")).rejects.toThrow(HeartRailsApiError);
  });
});

describe("fetchStations", () => {
  it("複数駅を重複除去・五十音順で返す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        response: { station: [{ name: "渋谷" }, { name: "新宿" }, { name: "渋谷" }] },
      }),
    );
    expect(await fetchStations("JR山手線")).toEqual(["渋谷", "新宿"]);
  });

  it("レスポンスが単一要素でも配列として扱う", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: { station: { name: "渋谷" } } }));
    expect(await fetchStations("JR山手線")).toEqual(["渋谷"]);
  });

  it("HeartRailsがerrorを返した場合は空配列", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: { error: "not found" } }));
    expect(await fetchStations("存在しない路線")).toEqual([]);
  });

  it("fetch自体が失敗した場合はHeartRailsApiErrorをthrowする", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(fetchStations("JR山手線")).rejects.toThrow(HeartRailsApiError);
  });
});

describe("fetchStationGeo", () => {
  it("候補が1件のとき、その緯度経度を返す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ response: { station: [{ name: "渋谷", x: "139.701", y: "35.658", line: "JR山手線" }] } }),
    );
    expect(await fetchStationGeo("渋谷")).toEqual({ lat: 35.658, lng: 139.701, line: "JR山手線" });
  });

  it("複数候補がある場合、lineHintと一致する候補を優先する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        response: {
          station: [
            { name: "渋谷", x: "139.701", y: "35.658", line: "JR山手線" },
            { name: "渋谷", x: "139.703", y: "35.659", line: "東急東横線" },
          ],
        },
      }),
    );
    expect(await fetchStationGeo("渋谷", "東急東横線")).toEqual({
      lat: 35.659,
      lng: 139.703,
      line: "東急東横線",
    });
  });

  it("lineHint不一致/未指定の場合は先頭候補を使う", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        response: {
          station: [
            { name: "渋谷", x: "139.701", y: "35.658", line: "JR山手線" },
            { name: "渋谷", x: "139.703", y: "35.659", line: "東急東横線" },
          ],
        },
      }),
    );
    expect(await fetchStationGeo("渋谷", "存在しない路線")).toEqual({
      lat: 35.658,
      lng: 139.701,
      line: "JR山手線",
    });
  });

  it("該当駅が0件の場合はnullを返す", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: { station: [] } }));
    expect(await fetchStationGeo("存在しない駅")).toBeNull();
  });

  it("緯度経度が数値に変換できない場合はnullを返す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ response: { station: [{ name: "渋谷", x: "invalid", y: "invalid" }] } }),
    );
    expect(await fetchStationGeo("渋谷")).toBeNull();
  });
});
