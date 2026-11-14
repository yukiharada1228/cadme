# cadloom

ピュアTypeScriptのCADカーネルに向けた最初の基盤です。現在は **有理数による2D領域演算、3D押し出し、三角形ソリッドの内外判定と立体集合演算** を実装しています。完全なCADカーネルや商用CADファイルのインポーターではありません。

このREADMEはソース版のAPIを対象とし、公開済みnpmパッケージに未収録の機能を含みます。

## 実行

Node.js 24以上を使用します。

```sh
npm ci
npm test
npm run typecheck
npm run example
```

`npm test`はビルド後にテストを実行します。`npm run example`は、入力と厳密な結果を`artifacts/intersection.json`に、表示用のSVGを`artifacts/intersection.svg`に保存します。実行時の外部ライブラリ・WASM・ネイティブアドオンはありません。TypeScriptとNodeの型定義は開発用依存です。

## インストール

```sh
npm install cadloom
```

ES ModulesとBigIntを利用します。Node.jsは24以上をサポートします。

## API

```ts
import { point2, segment2, intersectSegments } from 'cadloom';

const a = segment2(point2('0', '0'), point2('1', '1'));
const b = segment2(point2('0', '1'), point2('2', '0'));
const result = intersectSegments(a, b);
// { kind: 'point', point: { x: Rational(2/3), y: Rational(2/3) } }
console.log(JSON.stringify(result));
// {"kind":"point","point":{"x":"2/3","y":"2/3"}}
```

座標は`bigint`、`Rational`、正確な文字列を受け取ります。`number`は型と実行時の両方で拒否します。文字列は整数、小数（例`'-0.125'`）、整数の分数（例`'2/3'`）に対応します。指数表記、`.5`、非有限値は受け付けません。

`Rational`は約分済み・正の分母・不変の値です。`add`、`sub`、`mul`、`div`、`neg`、`sign`、`compare`、`equals`を提供します。分母ゼロとゼロ除算は`RangeError`です。

`orient2d(a,b,c)`は反時計回りなら`1`、時計回りなら`-1`、同一直線なら`0`を返します。

`intersectSegments(a,b)`は次のいずれかを返します。

- `{ kind: 'none' }`
- `{ kind: 'point', point }`
- `{ kind: 'overlap', segment }`

線分は両端を含みます。長さゼロの線分は点として扱います。重複区間の端点はx、次いでyの辞書順で正規化されるため、入力の順序や向きを変えても同じ結果になります。`pointOnSegment`も同じ閉線分の意味を持ちます。

## 線分群の分割（開発版）

`splitSegments`は入力端点、交点、重複区間の端点ですべての線分を分割し、同一座標の頂点と同一の辺を統合します。このAPIは次回リリース向けの開発版で、npmの`0.1.0`には含まれません。

```ts
import { point2, segment2, splitSegments } from 'cadloom';

const result = splitSegments([
  segment2(point2('-1', '0'), point2('1', '0')),
  segment2(point2('0', '-1'), point2('0', '1')),
]);
// result.vertices.length === 5
// result.edges.length === 4
// 中央の頂点: { point: (0,0), sources: [0,1] }
```

- `vertices`：`{ point, sources }`の配列。座標のx、次いでyの厳密な辞書順です。
- `edges`：`{ start, end, sources }`の配列。`start`と`end`は`vertices`へのインデックスで、`start < end`です。配列全体も`start`、次いで`end`で整列します。
- `sources`：入力線分配列の0始まりのインデックス。頂点ではその点を含む全入力、辺ではその辺全体を覆う全入力を、重複なし・昇順で記録します。
- 同じ入力集合を並べ替えたり端点を反転しても、頂点・辺の座標とインデックスは変わりません。`sources`は新しい入力順序に対応して変わります。
- 長さゼロの入力は頂点として保持し、その点を通る線分も分割します。長さゼロの辺は生成しません。
- 出力の辺同士は共有端点以外では交差・重複せず、出力頂点が辺の内部に残ることもありません。
- 出力は深くfreezeされ、入力オブジェクトから独立しています。面・半稜線・接続順序の情報はまだ生成しません。

総当たりで全線分ペアを調べます。入力数をn、辺を切る点の総数をkとすると、ペア検査はO(n²)、点の整列はO(k log k)以内、作業メモリはO(n+k)です。BigIntのビット長による演算コストは別途増大します。大規模データ向けの高速化は未実装です。

ソースをビルド後、図とJSONを生成できます。

```sh
npm run build
node examples/arrangement-to-svg.ts
```

`artifacts/arrangement.json`に正確な入力・結果を、`artifacts/arrangement.svg`に頂点・辺の番号付きの図を保存します。保存したJSONまたは`{ "segments": [[["0","0"],["1","1"]]] }`形式のファイルを再実行できます。

```sh
node examples/arrangement-to-svg.ts artifacts/arrangement.json artifacts/arrangement-replay
```

## 保存した入力の再実行

次のJSONを`case.json`に保存します。JSON数値ではなく文字列を使います。

```json
{
  "a": [["0", "0"], ["1", "1"]],
  "b": [["0", "1"], ["2", "0"]]
}
```

```sh
npm run example -- case.json artifacts/replay
```

保存された診断ファイル自体も再実行できます。

```sh
npm run example -- artifacts/intersection.json artifacts/replay
```

## 正しさの範囲

有理数演算、二線分交差、線分群分割について、前提・形式仕様・不変条件を明示した[正当性証明](docs/proofs/segment-arrangement.md)を用意しています。これは手書きの演繹証明であり、証明支援系による機械検証やTypeScript実行コードの形式検証ではありません。

別途、[Leanによる機械検証](formal/README.md)を追加しました。有理数演算の公式、退化・平行を含む線分交差、分割点の完全性と隣接辺、およびTypeScriptから抽出した交点式を検査します。検証対象は重要な数学的モデルに限定し、**TypeScript実行コード全体の形式検証は行っていません**。

カーネルの演算に浮動小数点やepsilonは使いません。有限の有理数入力に対して、有理数の四則演算で交差を計算します。SVGへの投影だけを近似し、結果の計算には戻しません。極端な縮尺ではSVG上で異なる点が重なる可能性があり、JSONが正確な結果です。

テストは境界事例、独立したBigInt判定との全組合せ照合、入力交換・反転、平行移動・正負の拡大縮小、交点の所属を検査します。これらは数学的な形式証明ではありません。入力サイズが非常に大きい場合にはBigIntの時間・メモリ制限があります。

## 次の段階

1. 平面上の接続順序・半稜線構造と領域の復元。
2. 穴を持つ2D領域の和・差・積。
3. 平面多面体の位相構造と3D演算。

曲面、3Dソリッド、CAD形式の読み書き、GUIはまだ含みません。

## ライセンス

MIT。詳細は[LICENSE](./LICENSE)を参照してください。

## 半辺と境界成分

`buildHalfEdges(segments)`は交点で分割した線分から、反転・次・前の接続を持つ半辺、頂点周りの反時計回りの出辺、閉じた境界巡回を返します。方向の比較と符号付き面積は有理数で計算します。

境界巡回はまだ面にグループ化していません。橋や重複頂点を含む場合があり、面積の符号だけで穴の所属を決定できません。[アルゴリズムの正当性と前提](docs/proofs/half-edges.md)を参照してください。

## 面の構築

`buildFaces(segments)`は境界成分を面にまとめます。`faces[0]`は非有界面で、残りは外側境界と穴・木状境界を持つ有界面です。`boundaryFaces`・`halfEdgeFaces`で所属先を参照できます。孤立頂点も面ごとに保持し、有界面の`twiceArea`は穴を差し引いた面積の2倍を厳密に返します。

```sh
npm run build
node examples/faces-to-svg.ts
# artifacts/faces.json と artifacts/faces.svg を生成
```

既定の例では交差する2つの四角形から面積1・3・3の領域を色分けします。所属判定も有理数で行い、固定の許容誤差は使いません。SVG表示への射影だけを近似します。[正当性と保証の範囲](docs/proofs/faces.md)を参照してください。面抽出は全ペアによる線分分割に加え、各境界の包含判定を行う実装で、大規模データ向けの空間索引は未実装です。

## ポリゴンの集合演算

```ts
import { booleanPolygons, point2 } from "cadloom";
const a = [[point2(0n, 0n), point2(2n, 0n), point2(2n, 2n), point2(0n, 2n)]];
const b = [[point2(1n, 1n), point2(3n, 1n), point2(3n, 3n), point2(1n, 3n)]];
const result = booleanPolygons(a, b, "intersection");
console.log(result.twiceArea.toString()); // "2"（面積1）
```

`union`・`intersection`・`difference`（aからbを引く）・`xor`を指定できます。入力は暗黙に閉じる環の配列で、各環には3点以上必要です。既定の塗り規則は`even-odd`、第4引数に`nonzero`も指定できます。自己交差・重複・退化環を扱います。

結果の`rings`は選択領域を左に持つ向きで、外側は反時計回り、穴は時計回りです。穴を差し引いた面積の2倍を`twiceArea`に保持し、`arrangement`・`selectedFaces`で元の面を参照できます。環が単純であることは保証せず、接触頂点を共有する場合があります。

これは面積領域の正則化演算です。点・線だけの交差は出力しません。[仕様と正当性](docs/proofs/polygon-booleans.md)を参照してください。

```sh
npm run build
node examples/polygon-booleans-to-svg.ts
# artifacts/polygon-booleans.{json,svg} に4演算の比較を生成
```

## 点の内外・境界判定

```ts
import { preparePolygon, locatePointInPolygon, point2 } from "cadloom";
const region = [[point2(0n, 0n), point2(4n, 0n), point2(4n, 4n), point2(0n, 4n)]];
const polygon = preparePolygon(region); // 正規化は一度だけ
polygon.locate(point2(1n, 1n)); // "inside"
polygon.locate(point2(0n, 1n)); // "boundary"
polygon.locate(point2(-1n, 1n)); // "outside"
locatePointInPolygon(point2(1n, 1n), region); // 単発の問い合わせ
```

既定は偶奇規則で、`preparePolygon(region, "nonzero")`も使えます。判定対象は正則化後の塗り領域です。打ち消された環や内部の共有辺は境界とは扱わず、面積0の入力曲線だけなら全ての点が外部になります。準備済みオブジェクトは入力から独立し、繰り返し判定は正規化後の辺数に対して線形です。[正当性と前提](docs/proofs/polygon-location.md)を参照してください。

## 厳密アフィン変換

```ts
import { affine2, transformPoint, composeAffine2, invertAffine2, point2 } from "cadloom";
const move = affine2(1n, 0n, 0n, 1n, 10n, 20n);
const scale = affine2(2n, 0n, 0n, 3n);
const t = composeAffine2(move, scale); // 先にscale、次にmove
transformPoint(t, point2(1n, 2n)); // (12, 26)
const inverse = invertAffine2(t);
```

係数順は`a,b,c,d,tx,ty`で、`x'=a*x+b*y+tx, y'=c*x+d*y+ty`です。引数を省略すると恒等変換になります。`transformSegment`・`transformPolygon`も使え、結果は不変です。反転・せん断・有理数係数の回転も表せます。

`affineDeterminant`が0なら逆変換は例外になります。特異変換の適用自体は可能ですが、面が潰れる場合があります。任意角度の回転は一般に無理数を要するため、有理数係数だけで厳密には表せません。[証明と制約](docs/proofs/affine-transforms.md)を参照してください。

## 穴を含む領域の三角形分割

```ts
import { triangulatePolygon } from "cadloom";
const mesh = triangulatePolygon(region); // 第2引数に"nonzero"も指定可能
// mesh.vertices: 厳密な有理数座標
// mesh.triangles: verticesを参照する反時計回りの3頂点インデックス
// mesh.twiceArea: 正規化後の領域の面積の2倍
```

凹形状・穴・自己交差を正規化してから、有理数の補助頂点を追加して分割します。隣接三角形の辺を揃え、辺の途中に頂点が接するT字接続を避けます。接触成分が頂点だけを共有する場合はあります。入力頂点だけを使う分割やDelaunay分割ではありません。[正当性と制約](docs/proofs/triangulation.md)を参照してください。

```sh
npm run build
node examples/triangulation-to-svg.ts
# artifacts/triangulation.{json,svg} に穴と島を含むメッシュを生成
```

## 2D領域の3D押し出し

```ts
import { extrudePolygon, inspectMesh } from "cadloom";
const solid = extrudePolygon(region, "3/2", { baseZ: "-1/3" });
console.log(solid.volume.toString()); // 正確な体積
const report = inspectMesh(solid);
// closed / consistentlyOriented / nondegenerate / manifoldVertices / signedVolume
```

穴・島・離れた複数成分を持つ領域から、外向きの閉じた三角形メッシュを作ります。`height`と`baseZ`はbigint・厳密な文字列・Rationalを受け付けます。負の高さにも対応し、`zMin`・`zMax`を返します。塗り規則は`fillRule`で指定します。高さ0と点接触による非多様体の境界は拒否します。空領域は体積0の空メッシュになります。

`inspectMesh`は辺の接続と向き・頂点リンク・非退化・符号付き体積を調べます。任意のメッシュの空間的な自己交差を検出するものではなく、閉じた適切な向きの境界という前提なしに符号付き体積を幾何学的体積として使うことはできません。[正当性と検査範囲](docs/proofs/extrusion.md)を参照してください。

```sh
npm run build
node examples/extrusion-viewer.ts
open artifacts/extrusion.html
```

穴のある板を回転・拡大縮小できる単独HTMLと、厳密なJSONを生成します。WebGL対応ブラウザーが必要です。表示だけ浮動小数点を使い、カーネルの座標・体積は有理数のままです。この表示例は曲面・3D集合演算・商用CAD互換を扱いません。

## 厳密な3D向き判定と平面交差

```ts
import { point3, segment3, plane3, orient3d, intersectSegmentPlane } from "cadloom";
const plane = plane3(1n, 1n, 1n, -1n); // x+y+z-1=0
const result = intersectSegmentPlane(
  segment3(point3(0n, 0n, 0n), point3(1n, 1n, 1n)), plane,
);
// {kind:"point", parameter:1/3, point:(1/3,1/3,1/3)} （各座標・パラメーターはRational）
```

`planeFromPoints(a,b,c)`は3点から平面を作り、重複・同一直線など法線が0になる入力は拒否します。`evaluatePlane3`は`normal·point+offset`、`classifyPointToPlane3`はその符号を返します。法線は単位化しないため、評価値は距離ではありません。

`orient3d(a,b,c,d)`の規約は`((b-a)×(c-a))·(d-a)`の符号で、退化・同一平面では0です。ベクトルの`dot3`・`cross3`・`subtract3`も有理数で計算します。

線分と平面の結果は`none`・`point`・`coplanar`です。端点接触と零長線分を扱い、平面上の非零長線分は共通部分全体を返します。返却点・線分は入力から独立した不変値です。

```sh
npm run build
node examples/segment-plane-intersection.ts
```

[数学的仕様・証明・比較テスト](docs/proofs/plane3.md)を参照してください。これは3Dカーネルの基礎です。三角形ソリッドの集合演算は後述の`booleanSolids3`で扱います。曲面BRepは未実装です。

## 三角形面と平面の交差・分割

```ts
import { point3, triangle3, plane3, splitTriangleByPlane } from "cadloom";
const face = triangle3(point3(0n,0n,0n), point3(2n,0n,0n), point3(0n,2n,0n));
const result = splitTriangleByPlane(face, plane3(1n,0n,0n,-1n)); // x=1
// positive: 1三角形、negative: 2三角形、coplanar: null
// intersection: (1,0,0)→(1,1,0)の線分
```

`intersectTrianglePlane`は共通部分を`none`・`point`・`segment`・`coplanar`で返します。`pointOnTriangle3`は辺・頂点を含む三角形所属を判定します。三角形の重複・同一直線の頂点は拒否します。

分割は元の向きを保ち、正側・負側には非零面積の三角形だけを返します。面全体が同一平面なら`coplanar`へ一度だけ返し、両側へ複製しません。点や線だけの接触は`intersection`で保持します。[仕様と証明](docs/proofs/triangle-plane-split.md)を参照してください。

```sh
npm run build
node examples/triangle-plane-split.ts
```

## 三角形の共有位相構造

`buildTriangleTopology(triangles)`は同じ有理数座標だけを共有頂点へ統合し、共有辺・半辺・面・シェルを構築します。面IDは入力三角形の位置を保持します。

- `halfEdges`の`next`・`previous`で面を巡回し、整合した共有辺では`twin`で反対側の面へ進めます。
- `shells`は辺を介した面の連結成分です。点だけの接触は別シェルとして残し、全体の頂点リンク診断で検出します。
- `issues`で開境界・非多様体辺・向き不整合・非多様体頂点・重複面を区別します。
- `boundaryLoops`は向き付き境界半辺のループです。境界が枝分かれ・不整合ならnull、境界がなければ空配列です。
- `closedManifold`は閉鎖・向き・リンク・重複の条件です。幾何学的な自己交差や外向きを保証するソリッド認定ではありません。

開いたシェルや不整合なシェルの`signedVolume`はnullです。閉じた整合シェルでも内向きなら負になります。このAPIではずれの補正やT字接続の自動分割は行いません。シェルの包含・空洞分類は後述の`prepareSolid3`で検査します。[不変条件の証明と検査範囲](docs/proofs/triangle-topology.md)を参照してください。

```sh
npm run build
node examples/triangle-topology.ts
# 閉じた押し出しと、平面で分割して境界が開いた面集合の接続を比較
```

## 三角形面どうしの交差・埋め込み検査

`intersectTriangles3(a,b)`は閉三角形の共通部分を`none`・`point`・`segment`・`polygon`で返します。同一平面の面積重なりと、点・辺だけの接触を区別し、有理数の座標を保ちます。多角形は3〜6頂点で、法線の最大成分を落とした巡回座標の射影で反時計回り、xyz最小頂点から始まります。入力面の向きを保存する規約ではありません。

`inspectTriangleEmbedding(triangles)`は全ての面ペアを調べ、共有する頂点・辺を超えた交差や重複面を、面インデックスと交差集合付きで返します。隣接面どうしの面積重複や未分割T字接続も検出します。

`embedded`は閉じたソリッドの認定ではありません。閉鎖・向き・非多様体は位相構造で別に検査し、シェルの包含・空洞分類は後述の`prepareSolid3`で検査します。現在はO(F²)の全ペア検査です。[仕様と証明](docs/proofs/triangle-intersection3.md)を参照してください。

```sh
npm run build
node examples/triangle-intersection3.ts
```

## 厳密なソリッド認定と内外判定

`prepareSolid3(triangles)`は閉じた面集合の位相・自己交差を検査し、シェルの包含深さと向きを確認します。外殻は外向き、空洞は内向き、その内側の島は外向きである必要があります。不正な入力は`RangeError`になります。接触するシェルの自動修復は行いません。

```ts
const solid = prepareSolid3(triangles);
solid.volume.toString();                 // 空洞を差し引いた厳密な体積
solid.locate(point3('1/3', '1/2', '2'));  // 'inside' | 'boundary' | 'outside'
solid.shells.map(s => s.depth);          // 外殻0、空洞1、島2…
```

空集合・複数の離れた立体・貫通穴にも対応します。辺や頂点を通る半直線は別の有理数方向で再試行し、許容誤差を使いません。認定時はO(F²)、問い合わせも最悪O(F²)回の算術演算が必要です。面集合のBoolean演算は後述の`booleanSolids3`で扱います。[判定の根拠と検証範囲](docs/proofs/solid3.md)を参照してください。

## 面の平面群による分割

`partitionTriangleByPlanes3(triangle, planes)`は、三角形を平面群で凸多角形へ分割します。各断片は元の面の向き、各平面に対する内部の符号列`signs`、厳密な内部代表点`witness`を持ちます。接触だけでは面積ゼロの断片を生成せず、同一平面の断片を両側へ重複させません。

三角形化の対角線を追加しないため、集合演算の面分類前に必要な断片を保持できます。面どうしの再接続や同一平面で重なる面の統合は別工程であり、このAPI単体では立体Boolean演算は行いません。[仕様と証明](docs/proofs/triangle-plane-arrangement.md)を参照してください。


## 厳密な多面体の集合演算

`booleanSolids3(a, b, operation)`は`union`・`intersection`・`difference`・`xor`を扱います。入力は`prepareSolid3`で認定可能な三角形配列、または同じカーネルから返されたBoolean結果です。出力は向き付き三角形配列`boundary`、共有位相`topology`、厳密な`volume`、内外判定`locate`を持ちます。

```ts
const cut = booleanSolids3(firstTriangles, secondTriangles, 'difference');
const assembled = booleanSolids3(cut, thirdTriangles, 'union');
console.log(assembled.volume.toString());
console.log(assembled.locate(point3('1/2', '1/2', '1/2')));
```

正則化した体積領域を返すため、点や辺だけの共通部分は空になります。和や対称差の結果で立体が辺・頂点だけで接する場合、その接触は保持し、`topology.closedManifold`はfalseになります。その場合も結果オブジェクトを次の演算へ渡せます。`boundary`だけを`prepareSolid3`へ渡すと、非多様体入力として拒否されます。

同一平面上の重なり、空洞、斜面を有理数のまま処理し、再接続後の辺の向きの釣り合いと面の不正交差も検査します。現時点では全平面による分割と全ペア検査を使うため、大きなモデルの性能最適化は残っています。[構成の証明・比較テスト・限界](docs/proofs/solid-booleans.md)を参照してください。

内外判定では、同一平面の交点計算を共有し、辺の判定式と厳密な座標範囲を事前計算します。幾何学的な許容誤差は追加していません。`npm run build`後に`node benchmarks/solid-location.ts`で、独立した箱の内外判定と照合するベンチマークを実行できます。[最適化の等価性・Lean補題・測定条件](docs/proofs/solid-location-performance.md)を参照してください。

## 曲線のための多項式・実代数的な根の基盤

有理数で表せない交点に備え、`Polynomial`と`AlgebraicReal`を追加しました。係数・区間端点は有理数で保持し、Sturm列による実根の個数・分離、根の厳密な順序・等値比較、根での多項式の符号判定を行います。

```ts
const equation = new Polynomial([-2n, 0n, 1n]); // 定数項から順に x² - 2
const sqrt2 = isolateRealRoots(equation)[1]!;
sqrt2.compare(AlgebraicReal.fromRational('7/5')); // 1
sqrt2.signOf(equation);                         // 0
sqrt2.signOf(new Polynomial([-3n, 0n, 1n]));     // -1
const refined = sqrt2.refine();                // 厳密な区間を狭めた新しい証明用データ
```

重根は1回だけ返し、`countRealRoots(p, a, b)`は両端を除く開区間の根を数えます。区間表現の`rational === null`は、無理数であることの証明ではありません。代数的数どうしの四則演算は後述のAPIで扱います。一般曲線・曲面の交差計算は未実装です。円との交差は後述の専用APIで扱います。[構成の根拠・独立比較テスト・未検証範囲](docs/proofs/real-roots.md)を参照してください。

```sh
npm run build
node examples/algebraic-roots.ts
```

## 円と代数的な交点

`circle2(center, radiusSquared)`は**半径の二乗**を受け取ります。たとえば`circle2(point2(0n, 0n), 2n)`は半径√2の円です。中心と半径の二乗は有理数、交点は実代数的な数として保持します。

```ts
const circle = circle2(point2(0n, 0n), 2n);
const line = line2(point2(0n, 0n), point2(1n, 0n)); // 原点＋t×方向
const hits = intersectLineCircle2(line, circle);  // (-√2,0), (√2,0)
hits[1]!.point.x.compare(AlgebraicReal.fromRational('7/5')); // 1
classifyAlgebraicPointToCircle2(hits[1]!.point, circle);     // 0（円上）
```

`intersectSegmentCircle2`は閉線分の端点を含み、`intersectCircles2`は有限個の交点または円全体の一致を返します。接線、同心円、半径ゼロの点円、長さゼロの線分も扱います。`circleThroughPoints2`で非共線な有理数の3点から円を作れます。

交点には相関を保つ共通パラメータと厳密なx・y座標があり、他の円への所属、2つの有理点に対する向き、交点どうしの辞書順を判定できます。`AlgebraicReal.affine(scale, offset)`で有理数による拡大・平行移動も行えます。円弧は後述のAPIで扱います。曲線領域の集合演算や曲面ソリッドとの統合はまだ未実装です。[仕様・証明・比較テスト](docs/proofs/circle-intersections.md)を参照してください。

```sh
npm run build
node examples/circle-intersections.ts
```


## 実代数的な数の四則演算

`AlgebraicReal`の`add`・`sub`・`mul`・`div`・`neg`・`reciprocal`で、異なる多項式から得た実数の根どうしを厳密に計算できます。`sign`・`equals`・`compare`も値として判定し、区間表現に隠れたゼロでの除算も拒否します。

```ts
const sqrt2 = isolateRealRoots(new Polynomial([-2n, 0n, 1n]))[1]!;
const sqrt3 = isolateRealRoots(new Polynomial([-3n, 0n, 1n]))[1]!;
const value = sqrt2.add(sqrt3).mul(sqrt2.sub(sqrt3));
value.equals(AlgebraicReal.fromRational(-1n)); // true
```

`algebraicCoordinates2`と`orientAlgebraicPoints2`で、独立した代数的な座標を持つ3点の向き・共線性も扱えます。`polynomialResultant`は有理係数の終結式を返します。結果の多項式は最小多項式とは限らず、演算を重ねると次数や係数が大きくなるため、性能改善は残っています。[構成の根拠・比較テスト・検証範囲](docs/proofs/algebraic-field.md)を参照してください。

```sh
npm run build
node examples/algebraic-field.ts
```

## 代数的な端点を持つ円弧

`circularArc2(circle, start, end, { direction: 'ccw' })`で、閉じた円弧を作れます。端点は有理点でも代数的な交点でも構いません。`cw`で時計回りにできます。同じ端点は既定では点円弧になり、円全体は`fullCircleArc2(circle)`または`fullCircle: true`で明示します。

```ts
const unit = circle2(point2(0n, 0n), 1n);
const quarter = circularArc2(unit, point2(1n, 0n), point2(0n, 1n));
locatePointOnArc2(point2('3/5', '4/5'), quarter); // 'interior'
const pieces = splitCircularArc2(quarter, [point2('3/5', '4/5')]);
const otherArc = circularArc2(unit, point2(0n, 1n), point2(-1n, 0n));
const common = intersectArcs2(quarter, otherArc); // 共有端点を保持
```

所属・巡回順序・分割・直線／線分との交差・円弧どうしの交差を、角度の小数近似なしで扱います。重なりは複数の円弧成分と孤立した接触点を区別して保持します。`classifyAlgebraicPointToCircle2`も独立した代数的座標を受け取れるようになりました。円弧を共有頂点・辺へ分割する処理は後述の`splitCurves2`で扱います。曲線領域の集合演算は後述の`booleanCurveRegions2`で扱います。[規約・構成の証明・比較テスト](docs/proofs/circular-arcs.md)を参照してください。

```sh
npm run build
node examples/circular-arcs.ts
```

## 線分・円弧の共有頂点と辺

`splitCurves2`は線分、代数的なパラメータで切り取った直線区間、円弧、孤立点を混在させ、交点・接触点・重なりの端点を共有頂点へ統合します。重なった辺は1本にまとめ、`sources`に入力番号、`uses`に各入力の向き（+1/-1）を保持します。

```ts
const graph = splitCurves2([
  { kind: 'arc', arc: fullCircleArc2(circle2(point2(0n, 0n), 2n)) },
  { kind: 'segment', segment: segment2(point2(0n, -3n), point2(0n, 3n)) },
]); // 6頂点・7辺。上下の交点は (0, ±√2)
const nodedAgain = splitCurves2(graph.edges); // 代数的な端点を持つ辺も再入力可能
```

`lineInterval2(line, startParameter, endParameter)`で代数的な端点を持つ閉直線区間を作れます。入力の`kind: 'line'`で渡し、`kind: 'point'`では孤立した有理点・代数点を渡せます。円弧は左右の極点でも分割し、円全体の任意のシームがグラフの形状に影響しないようにします。座標の多項式表現が異なっても、値が同じ点は同じ頂点になります。

ここで得られるのは頂点と辺のグラフです。接線が一致する場合も含めた回転順序と半辺は後述の`buildCurveHalfEdges2`で扱います。面の分類は後述の`buildCurveFaces2`で扱います。曲線領域の集合演算は後述の`booleanCurveRegions2`で扱います。[構成の証明・不変条件・比較テスト](docs/proofs/curved-arrangements.md)を参照してください。

```sh
npm run build
node examples/curved-arrangements.ts
```

## 曲線の回転順序と半辺構造

`buildCurveHalfEdges2(curves)`は共有頂点・辺を作り、各辺の両方向の半辺、`twin`・`next`・`previous`、左側の境界巡回を構築します。

```ts
const topology = buildCurveHalfEdges2([
  { kind: 'arc', arc: fullCircleArc2(circle2(point2(0n, 0n), 1n)) },
  { kind: 'arc', arc: fullCircleArc2(circle2(point2(2n, 0n), 1n)) },
]);
// 外接点では接線が一致しても、符号付き曲率で異なる扇形を区別
const walks = topology.boundaries.map(w => w.halfEdges);
```

`outgoing`は接線方向と符号付き曲率による反時計回りの巡回順序です。`germ`には非単位の厳密な接線と、曲率の符号・半径の二乗を保持します。接線の外積は一次式へ整理し、角度近似や不要な代数的乗算を避けています。

この関数は境界巡回までを返します。面への分類は`buildCurveFaces2`で行います。円弧の弦から面積を計算する代用値は返しません。[順序付けの根拠・接触時の左右・検証範囲](docs/proofs/curve-half-edges.md)を参照してください。

```sh
npm run build
node examples/curve-half-edges.ts
```


## 円弧を含む面の構築と位置判定

`buildCurveFaces2(curves)`は線分と円弧の境界巡回を面へ分類します。`faces[0]`は非有界面で、各面には境界巡回の番号、孤立頂点、面内の厳密な有理数サンプル点を保持します。穴や橋を含むため、境界巡回の数と面の数は一致しません。

```ts
const arrangement = buildCurveFaces2([
  { kind: 'arc', arc: fullCircleArc2(circle2(point2(0n, 0n), 4n)) },
  { kind: 'arc', arc: fullCircleArc2(circle2(point2(0n, 0n), 1n)) },
]);
// 外部・環状部分・内側の円の内部の3面
const location = arrangement.locate(point2('3/2', 0n));
// { kind: 'face', face: ... }; 境界上なら edge または vertex
```

`boundaryFaces`と`halfEdgeFaces`は左側の面、`vertexFaces`は接する面の番号を返します。位置判定は代数的実数の座標にも対応します。分類は厳密な垂直断面と接線・曲率の順序で行い、円弧の面積近似は使いません。この関数は平面の分割を返します。塗りつぶし規則や集合演算は`booleanCurveRegions2`で扱います。[構成の根拠と検証範囲](docs/proofs/curve-faces.md)を参照してください。


## 円弧を含む領域の集合演算

`booleanCurveRegions2(a, b, operation, fillRule)`は、線分・直線の代数的トリム・円弧で閉じた境界の和・積・差・排他的論理和を計算します。入力は`CurveRegion2`（閉じた巡回の配列）で、各巡回は`segment`・`line`・`arc`の配列です。単独の全円も巡回になります。始終点の接続を厳密に検査し、閉じていない入力は拒否します。

```ts
const disk = (x: bigint): CurveRegion2 => [[{
  kind: 'arc', arc: fullCircleArc2(circle2(point2(x, 0n), 1n)),
}]];
const lens = booleanCurveRegions2(disk(0n), disk(1n), 'intersection');
const crescent = booleanCurveRegions2(disk(0n), lens.rings, 'difference');
console.log(lens.locate(point2('1/2', 0n))); // inside
```

`operation`は`union`・`intersection`・`difference`・`xor`、`fillRule`は`even-odd`（既定）・`nonzero`です。面の巻き数はBigInt整数で保持し、重複・逆向き・自己交差を扱います。出力の`rings`は選択領域を左側に持ち、代数的な端点を保ったまま次の演算に渡せます。接点や辺だけの交差は面として残さない正則化集合演算です。

`locate`は`inside`・`boundary`・`outside`を返し、相殺された曲線や内部の共有辺を境界に数えません。`arrangement`・`selectedFaces`・`windings`で演算の元になった面と両入力の巻き数も参照できます。円弧の面積は近似して返しません。[構成の根拠・比較テスト・制限](docs/proofs/curve-booleans.md)を参照してください。

```sh
npm run build
node examples/curve-booleans.ts
```


## 3Dの解析的支持面：平面・円柱面

`Surface3`は`{ kind: 'plane', plane }`または`{ kind: 'cylinder', cylinder }`です。円柱は有理数の軸と正の半径の二乗で表し、軸を単位ベクトルへ近似しません。

```ts
const surface: Surface3 = {
  kind: 'cylinder',
  cylinder: cylinder3(line3(point3(0n, 0n, 0n), vector3(1n, 1n, 1n)), 1n),
};
const hit = intersectLineSurface3(
  line3(point3(0n, 0n, 0n), vector3(1n, -1n, 0n)), surface,
);
// kind: 'points'（代数的な交点とパラメータ）・'contained'・'none'
```

`intersectSegmentSurface3`は端点を含む線分との交差を扱います。`classifyPointToSurface3`は平面の向きに対する符号、または円柱の内側（-1）・面上（0）・外側（1）を返します。座標は有理数でも、`algebraicCoordinates3`で作った独立した代数的実数でも構いません。`normalToSurface3`は面上で厳密な非単位法線を返し、`surfacesCoincide3`は軸の原点・スケールや平面の向きを無視して支持面の一致を判定します。

このAPIは無限に広がる支持面の層です。境界曲線と共有辺・面・シェルの接続は後述のAPIで扱います。面の領域や立体の幾何学的検証は引き続き構築します。[円柱の式・交差・法線の証明と検証範囲](docs/proofs/analytic-surfaces3.md)を参照してください。

```sh
npm run build
node examples/analytic-surfaces3.ts
```


## B-repへ向けた3Dの辺と支持面上の閉路

`lineInterval3`は有理数の直線を代数的なパラメータで切り取ります。`planarArc3`は局所的な円弧を有理数の平面座標系`PlaneFrame3`へ写します。座標系は直交・単位長である必要がなく、傾いた断面の楕円状の辺も表現できます。有理数のアフィン円弧では表せない任意軸の円は、後述の`circle3`・`circularArc3`で扱います。一般の円錐曲線の交差は引き続き拡張します。

```ts
const frame = planeFrame3(
  point3(0n, 0n, 0n), vector3(1n, 0n, 0n), vector3(0n, 1n, 1n),
);
const edge: Curve3 = {
  kind: 'planar-arc',
  arc: planarArc3(frame, fullCircleArc2(circle2(point2(0n, 0n), 1n))),
};
// (x,y,y), x²+y²=1：円柱 x²+y²=1 と平面 z-y=0 の断面
const loop = curveLoop3([edge], {
  kind: 'cylinder',
  cylinder: cylinder3(line3(point3(0n, 0n, 0n), vector3(0n, 0n, 1n)), 1n),
});
```

`mapPlanePoint3`と`pointInPlaneFrame3`は平面座標の写像と逆写像です。平面外の点への逆写像は`null`を返します。`pointOnCurve3`はトリムを含む辺上の判定、`reverseCurve3`は向きの反転、`curveOnSurface3`は辺全体が支持面上にあるかの判定を行います。端点だけの一致では面上と判定しません。

`curveLoop3`は閉路の接続と全曲線の支持面への所属を検査します。自己交差・往復・面積ゼロはまだ排除しないため、これだけでB-repの面や立体の妥当性を保証するものではありません。辺の共有とシェルの接続は後述の`buildBRepTopology3`で扱います。面の領域と立体の検証は引き続き構築します。[構成の根拠・検証範囲](docs/proofs/brep-curves3.md)を参照してください。

```sh
npm run build
node examples/brep-curves3.ts
```


## 任意の有理数法線を持つ空間円と円弧

`circle3(center, normal, radiusSquared)`は、中心・平面法線・半径の二乗から空間円を表します。法線の長さを単位化せず、`(1,1,1)`のような向きでも厳密に扱えます。半径ゼロは点円です。`circleThroughPoints3`は非共線な有理数の3点を通る円を構築します。

```ts
const circle = circle3(point3(0n, 0n, 0n), vector3(1n, 1n, 1n), 1n);
const arc = fullCircleArc3(circle);
const edge: Curve3 = { kind: 'circular-arc', arc };
const hits = intersectLineCircle3(
  line3(point3(0n, 0n, 0n), vector3(1n, -1n, 0n)), circle,
);
// 交差パラメータは ±sqrt(1/2)。座標も代数的実数として保持
```

`circularArc3`は空間円上の端点と`direction`・`fullCircle`から円弧を作ります。CCW/CWは法線に対する向きです。所属判定・巡回順序・分割・反転に加え、直線／線分・平面・円・円弧との交差を角度の小数近似なしで扱います。重なる円弧と孤立した接点を区別し、反対向きの法線で記述された同じ円も照合します。

`Curve3`の円弧として`curveLoop3`や支持面への所属判定に渡せます。中心と法線は現在有理数です。共有辺とシェルの接続は後述の`buildBRepTopology3`で扱います。面の領域と立体の検証は引き続き構築します。[交差・向き・検証範囲](docs/proofs/spatial-circles3.md)を参照してください。

```sh
npm run build
node examples/spatial-circles3.ts
```


## B-repの共有辺・コエッジ・面・シェルの接続

`buildBRepTopology3(edges, faces)`は、`Curve3`の辺をIDで明示的に共有し、向き付きの使用（コエッジ）、閉じた境界巡回、支持面を持つ面、辺で接続したシェルを構築します。

```ts
const faces: BRepFaceInput3[] = [{
  surface: { kind: 'plane', plane: plane3(0n, 0n, 1n) },
  sense: 1,
  loops: [[{ edge: 0, direction: 1 }]],
}];
// edges[0]がこの平面上の全円なら、1辺の閉路を持つ開いた面の接続構造
const topology = buildBRepTopology3(edges, faces);
```

端点は代数的実数の厳密な座標一致で頂点へ統合します。辺全体の支持面への所属、閉路の接続、辺の使用回数と方向、頂点まわりの接続を検査します。全円の始終点や同じ端点を持つ別の円弧でも、辺の両端の接続口を区別します。円柱の周期的な継ぎ目で、同じ面が辺を両方向に使う場合にも対応します。

`issues`で境界辺・未使用辺・非多様体の辺／頂点・使用方向の不一致を参照できます。`sense`は支持面に対する法線の向きで、ループはその向きを含めて明示的に渡します。`sense`を変えてもループを自動反転しません。

`closedOrientedIncidence`は接続検査の結果です。面の領域・境界と法線の幾何学的な整合・自己交差・シェルの入れ子・立体の内外はまだ保証しません。同じ座標の辺でもIDが異なれば自動共有せず、辺の交差や重なりの分割もこの関数では行いません。[接続口のモデル・検証範囲](docs/proofs/brep-topology3.md)を参照してください。

```sh
npm run build
node examples/brep-topology3.ts
```


## 平面の面領域と境界の向き

`preparePlanarFace3(frame, region, sense)`は、平面座標系と2Dの線分・円弧領域から、非空で内部が連結した平面の面を構築します。`sense`は座標系の`u×v`に対する法線の向き（+1／-1）です。入力の巻き数と向きを検査し、交差・接触・重複・相殺・内部の余分な辺・点だけの辺・非連結な領域を拒否します。境界を自動修復するAPIではありません。

有理数の平面写像では表せない向きの空間円には、`prepareCircularFace3(outer, holes, sense)`を使えます。正の半径の外円板と、互いに接触・重複しない厳密に内部の円形の穴から面を構築します。

```ts
const center = point3(2n, 3n, 4n), normal = vector3(1n, 1n, 1n);
const face = prepareCircularFace3(
  circle3(center, normal, 4n), [circle3(center, normal, 1n)],
);
face.locate(center);                 // outside（穴の内部）
face.locate(point3(3n, 2n, 4n));     // inside
face.locate(face.sample);            // inside（厳密な内部サンプル）
```

両APIは`PreparedPlanarFace3`を返します。`boundary`は法線と整合する向きの3D境界、`normal`は非単位の厳密な法線、`topology`は1面のB-rep接続です。単独の面は境界を持つ開いた曲面なので、`topology.closed`はfalseで境界辺の診断があります。これは面の不正を意味しません。平面外の点は`locate`で`outside`になります。

これらは指定した表現から平面の面を構築するAPIです。一定の軸方向上下限と円弧範囲を持つ円柱面は後述の`prepareCylinderFace3`で扱います。任意の既存B-repの面、一般の円柱面トリム、面同士の交差・シェル全体の埋め込みや立体の妥当性はまだ検証しません。[領域と向きの根拠・検証範囲](docs/proofs/planar-face3.md)を参照してください。

```sh
npm run build
node examples/planar-face3.ts
```


## 円柱面の領域・向き・位置判定

`prepareCylinderFace3(cylinder, lower, upper, options)`は、有限の全周バンドまたは円弧範囲の円柱面を構築します。上下限は軸のパラメータの有理数で、単位長の軸に近似した距離ではありません。`options.angular`は軸の原点を中心とする参照円上の`CircularArc3`です。省略すると全周になります。`sense`は外向き（+1、既定）／内向き（-1）です。

```ts
const surface = cylinder3(
  line3(point3(0n, 0n, 0n), vector3(1n, 1n, 1n)), 1n,
);
const face = prepareCylinderFace3(surface, 0n, '2/3');
face.locate(face.sample); // inside
face.normalAt(face.sample); // 厳密な非単位法線
```

全周の面は2つの円周境界を持つ環状面で、継ぎ目を境界に数えません。部分円柱は2円弧と2直線で閉じます。無理数の端点を持つ直線は`algebraicSegment3`で表し、`Curve3`の`algebraic-segment`として支持面への所属・反転・点の所属・B-rep接続に渡せます。

`interiorPointOnArc3`は円弧内部の点を角度近似なしで求めます。代数的座標の平行移動・差には`translateAlgebraicPoint3`・`subtractAlgebraicPoints3`を使えます。円柱面の`locate`は無理数の高さの問い合わせにも対応し、`normalAt`は面の範囲外を拒否します。

現在の領域は円弧と一定の軸方向上下限の積です。斜めの切断曲線や任意の穴を含む一般の円柱面トリム、任意の既存B-repの面、シェル全体の交差・埋め込み・立体の検証はまだ対象外です。[構成・向き・検証範囲](docs/proofs/cylinder-face3.md)を参照してください。

```sh
npm run build
node examples/cylinder-face3.ts
```


## 閉じた解析的B-repの押し出し

`extrudeCurveRegionBRep3(region, height, options)`は線分・円弧の2D領域を垂直に押し出し、平面・円柱面と厳密な共有辺を持つ閉じたB-repを構築します。円弧を三角形や弦へ近似しません。穴・離れた成分・穴の中の島に対応し、接点でつながる不正な境界は拒否します。

```ts
const region: CurveRegion2 = [[{
  kind: 'arc', arc: fullCircleArc2(circle2(point2(0n, 0n), 1n)),
}]];
const solid = extrudeCurveRegionBRep3(region, 2n, { baseZ: '-1/2' });
solid.locate(point3(0n, 0n, 0n)); // inside
solid.topology.closedOrientedIncidence; // true
```

既定の塗り規則は`even-odd`で、`options.fillRule`に`nonzero`も指定できます。入力を正則化してから各連結領域を検証します。符号付き高さは`zMin`・`zMax`へ整理します。空の領域は面・シェル・内部サンプルを持たない空の立体になります。

`faces`には各面の検証済み領域、`topology`には共有辺・コエッジ・面・シェル、`samples`には各成分の内部点を保持します。各面のローカル接続IDと、立体全体の共有IDは別です。円柱壁は円の極値などで複数面に分割される場合がありますが、円柱としての形状は厳密に保ちます。

直線の側面には`prepareRectangleFace3`の代数的なトリム上下限を使います。`translateCurve3`は厳密な平行移動、`translatePlanarFace3`は同じモジュールのファクトリで構築した面の検証を保つ平行移動と向きの変更です。構造的にコピーしただけの面は検証済みとは見なさず拒否します。

閉じた接続だけで立体を認定するのではなく、検証済み2D領域と高さ区間の直積として自己交差のない境界を構成します。任意の既存B-repの検証や一般の3D集合演算はまだ対象外です。円弧を含む一般の体積は代数的実数だけでは表せないため、近似体積は返しません。[構成の証明・共有辺・検証範囲](docs/proofs/extruded-brep3.md)を参照してください。

```sh
npm run build
node examples/extruded-brep3.ts
```

## 平面・円柱の交線と楕円弧

`intersectPlaneCylinder3(plane, cylinder)`は支持面の交差を、楕円・2本の母線・接する1本の母線・空集合へ厳密に分類します。任意方向の有理数の軸・法線に対応し、母線の無理数の位置は`AlgebraicLine3`として保持します。`intersectPlanes3`は平面同士の交差です。

`ellipse3(frame, radiusUSquared, radiusVSquared)`は独立した有理数の軸と正の有理数の座標半径の二乗で楕円を表します。軸の単位化・固有ベクトルの近似を使いません。`intersectLineEllipse3`・`intersectSegmentEllipse3`・`intersectEllipsePlane3`は有限交点または一致を返します。

`ellipticArc3`・`fullEllipseArc3`で楕円弧を構築し、所属判定・厳密な巡回順序・分割ができます。`Curve3`の`elliptic-arc`として平行移動・反転・支持面への所属判定・B-repの周期辺に接続します。

このAPIは支持面の交線を返します。有限の面での切り取りと楕円同士の交差は後述のAPIを使ってください。楕円でトリムされた面の構築と曲面B-repのBoolean演算は今後の開発です。[計算式・構成・検証範囲](docs/proofs/plane-cylinder3.md)を参照してください。

```sh
npm run build
node examples/plane-cylinder3.ts
```

## 有限の円柱面と平面の交差

`intersectPlaneCylinderFace3(plane, face)`は`prepareCylinderFace3`の有限の高さ・角度の範囲で交線を切り取ります。`curves`には閉じた楕円弧または代数的端点の線分と交差の重複度、`points`には曲線に含まれない孤立した接触点を返します。接する母線の重複度は2です。楕円の継ぎ目や境界で弧が分割されるため、隣接する弧が端点を共有する場合があります。

```ts
const face = prepareCylinderFace3(
  cylinder3(line3(point3(0n, 0n, 0n), vector3(0n, 0n, 1n)), 1n),
  '-1/2', '1/2',
);
const section = intersectPlaneCylinderFace3(plane3(1n, 0n, -1n), face);
// x=zの楕円を高さ範囲で切り取り、閉じた楕円弧として返す
```

`interiorPointOnEllipticArc3`は非退化な楕円弧の内部点を厳密に求めます。有限の平面側の領域による切り取りは後述の`intersectPlanarCylinderFaces3`に対応しています。切断後の面の構築・接続、一般の曲面Boolean演算はまだ対象外です。[完全性の構成・検証範囲](docs/proofs/cylinder-face-section3.md)を参照してください。

## 有限の平面と円柱面の交差

`intersectPlanarCylinderFaces3(planarFace, cylinderFace)`は両方の有限領域で交線を切り取り、楕円弧・線分と孤立した接触点を返します。平面側は既存の円形・穴付き円形・長方形・線分と円弧のチャート領域に対応します。平面はファクトリで構築したものを渡してください。戻り値は`intersectPlaneCylinderFace3`と同じ`CylinderFaceSection3`です。

`intersectEllipses3`は異なる平面上の楕円、同一平面上の最大4交点、接触、一致を扱います。`intersectAlgebraicSegmentEllipse3`は代数的な端点の線分との交点を返します。`AlgebraicReal.rationalFunction(numerator, denominator)`は同じ代数的数を含む有理式を、元の代数的数の次数以下で評価します。

切断後の面の構築・縫い合わせや一般の曲面立体Boolean演算は今後の開発です。[構成・完全性・検証範囲](docs/proofs/planar-cylinder-intersection3.md)を参照してください。

```sh
npm run build
node examples/planar-cylinder-intersection3.ts
```

## 円柱面を平面で分割する

`splitCylinderFaceByPlane3(face, plane)`は有限の円柱面を平面の負側・正側へ正則化して分割します。`negative`・`positive`には所属判定と境界の辺参照、`edges`には共通の辺テーブル、`sharedEdges`には両側が逆向きに使う切断辺のIDを保持します。接するだけの母線は新しい分割境界にしません。

```ts
const split = splitCylinderFaceByPlane3(face, plane3(1n, 0n, -1n));
split.negative.locate(point); // inside / boundary / outside
split.negative.loops;        // 閉じた境界ループ。接続が一意でない頂点があればnull
split.sharedEdges;          // 両領域で同じ辺IDを逆向きに参照
```

各側は複数の連結成分を含む場合があります。境界が接する頂点では任意のループ接続を作らず、辺参照のグラフを保持して`loops: null`を返します。両側のループが一意なら`topology`にB-repの接続を構築しますが、連結した面や閉じた立体の認定ではありません。

`intersectAlgebraicSegmentPlane3`は代数的な端点の線分と平面を交差させ、共有パラメータを持つ点や有理数の変位を保って計算します。[正則化・向き・接続・検証範囲](docs/proofs/cylinder-plane-split3.md)を参照してください。

```sh
npm run build
node examples/cylinder-plane-split3.ts
```

## 再分割できる円柱トリム領域と連結成分

`prepareTrimmedCylinder3(baseFace, halfspaces)`は有限の円柱面を複数の有理数の平面で切り取り、正則化した領域を構築します。`halfspaces`は`{ plane, side: -1 | 1 }`の配列です。`components`には連結した内部ごとのサンプル、境界辺参照、ループ、所属判定を持ちます。点や線だけが残る部分は2D領域として除きます。

```ts
const region = prepareTrimmedCylinder3(face, [
  { plane: plane3(1n, 0n, 0n, '-1/2'), side: -1 },
  { plane: plane3(-1n, 0n, 0n, '-1/2'), side: -1 },
]); // 単位円柱なら2つの連結成分
const component = extractTrimmedCylinderComponent3(region, 0);
const split = splitTrimmedCylinderByPlane3(component, plane3(0n, 0n, 1n));
```

取り出した成分も分割後の`negative`・`positive`も、さらに分割できます。円周方向の区間と各角度で許される高さ範囲から連結成分を求めるため、境界ループの個数には依存しません。接点を共有する成分は内部を分けて保持します。1つの成分の境界が自己接触する場合は`loops: null`を返し、領域の所属判定と再分割は継続できます。

再分割の`edges`・`negativeUses`・`positiveUses`・`sharedEdges`は共通の辺IDを持ちます。各成分のループが一意なら`topology`に成分ごとのB-rep接続を構築します。異なる成分が点で接する場合の非多様体性は接続診断で報告します。[連結性・再分割・検証範囲](docs/proofs/trimmed-cylinder3.md)を参照してください。

```sh
npm run build
node examples/trimmed-cylinder3.ts
```

## 平面トリム領域の分割と楕円の面

`prepareEllipseFace3(ellipse, sense)`は楕円を塗りつぶした平面の面を構築します。`prepareTrimmedPlanar3(baseFace, halfspaces)`は、既存の長方形・円形と穴・線分と円弧のチャート領域・楕円の面を有理数の平面で切り取り、連結した内部ごとに`components`へ分けます。凹部や穴を含む面も対象です。

```ts
const region = prepareTrimmedPlanar3(face, [
  { plane: plane3(1n, 0n, 0n), side: -1 },
]);
const split = splitTrimmedPlanarByPlane3(region, plane3(0n, 1n, 0n));
if (split.kind === 'split') {
  split.negative.components;
  split.sharedEdges; // 両側で同じ辺IDを逆向きに使う
}
```

両方の子領域をさらに分割できます。切断面が元の平面全体と一致する場合は`kind: 'coplanar'`を返します。点や線だけが残る部分は正則化して除き、成分の境界が点で接する場合は接続診断へ保持します。任意の曲線領域による追加の切り取りは今後の開発です。円柱と平面の積集合を閉じたB-repへ構築するAPIは後述しています。[構成・連結性・検証範囲](docs/proofs/trimmed-planar3.md)を参照してください。

```sh
npm run build
node examples/trimmed-planar3.ts
```

## 円柱と平面から閉じた立体B-repを構築する

`clipCylinderBRep3(cylinder, lower, upper, halfspaces)`は、内部を満たした有限の円柱と有理数の平面半空間の積集合を構築します。円柱壁と平面の切断面を解析形状のまま生成し、境界をそろえて共有辺を持つ閉じたB-repへ接続します。

```ts
const solid = clipCylinderBRep3(
  cylinder3(line3(point3(0n, 0n, 0n), vector3(0n, 0n, 1n)), 1n),
  -2n, 2n,
  [{ plane: plane3(1n, 0n, 1n), side: -1 }],
);
solid.topology.closedOrientedIncidence; // true
solid.interiorSample; // 厳密に内部にある有理数の点
solid.locate(point3(0n, 0n, -1n)); // inside
```

上下限は入力軸のパラメータです。`faces`は`topology.faces`と同じ順序で、各面の領域と連結成分を保持します。接するだけの面や体積を持たない結果は正則化して除きます。円柱壁がすべて消え、内側の多面体だけが残る場合にも対応します。切断で楕円が残る部分は楕円弧として保持します。

`sewBRepFaces3`は面の境界を既知の端点で分割して共通の辺へまとめ、元の曲線から辺への対応を`sourceUses`へ記録します。任意の面同士の交差計算や立体の認定には追加の幾何検証が必要です。`clipCylinderBRep3`は円柱と半空間の既知の積集合として領域を構成し、閉じた接続・向き・内部点を検査します。対象は凸な円柱／平面の積集合で、一般の曲面Boolean演算や穴付き立体は今後の開発です。

[境界の接続と範囲](docs/proofs/sew-brep3.md)・[立体の構成と検証範囲](docs/proofs/clipped-cylinder-brep3.md)を参照してください。

```sh
npm run build
node examples/clipped-cylinder-brep3.ts
```

## 閉じた円柱立体の平面分割と再接続

`splitClippedCylinderByPlane3`は上記の立体を平面の負側・正側へ分割します。
両側に体積が残る場合、閉じた子立体と共通の切断面を返します。

```ts
const split = splitClippedCylinderByPlane3(solid, plane3(1n, 0n, 0n));
if (split.kind === 'split') {
  split.negative.topology.closedOrientedIncidence; // true
  split.positive.topology.closedOrientedIncidence; // true
  split.shared.edges; // 両側で共用する境界曲線の表
  split.shared.negativeBoundary; // 子の辺から共通表への対応
  const joined = rejoinClippedCylinderSplit3(split);
  joined.sewing.topology.closedOrientedIncidence; // true
}
```

結果は`split`・`touching`・`disjoint`・`empty`を区別します。
接触のみ・交差なしの場合、体積が残る側は元の立体をそのまま保持します。
既存の頂点と楕円弧の極値で先に厳密判定し、体積が消える側の境界構築を省きます。
子の外側の面には元の面への対応を記録し、新しい切断面には`null`を記録します。
再接続は対応する内部の切断面を除いて外側の境界を接続する操作です。
対象は凸な円柱／平面の積集合で、任意の立体同士の和演算は今後の開発です。
[構成・接触判定・検証範囲](docs/proofs/clipped-cylinder-split3.md)を参照してください。

```sh
npm run build
node examples/clipped-cylinder-split3.ts
```

## 厳密なNURBS曲線

`nurbsCurve3`は有理数の制御点・正の重み・ノット列から非周期NURBS曲線を構築します。
有理数と代数的実数のパラメータでの評価、片側微分、ノット挿入、分割、反転、平面との交差を扱います。
各区間を同次座標の多項式として計算し、交差パラメータは実根分離で求めます。

```ts
const curve = nurbsCurve3(
  2,
  [point3(1n, 0n, 0n), point3(1n, 1n, 0n), point3(0n, 1n, 0n)],
  [0n, 0n, 0n, 1n, 1n, 1n],
  [1n, 1n, 2n],
);
const p = evaluateNurbsCurve3(curve, '1/2'); // (3/5, 4/5, 0): 厳密な単位円の一部
const split = splitNurbsCurve3(curve, '1/2'); // 元のパラメータを保持
const hit = intersectNurbsPlane3(curve, plane3(3n, 4n, 0n, -5n));
hit.points[0].branches[0].multiplicity; // 2: この曲線では接触
```

ノットの最大重複度は次数+1です。不連続点では`'left'`／`'right'`で評価する側を選べます。
交差結果はノットの両側の点と重複度、平面上に含まれる区間を保持します。
自由曲線のB-rep接続、曲線同士の交差、商用CAD形式の入出力は今後の開発です。NURBS曲面の幾何APIは後述します。
現在の`Curve3`とは別のパラメトリック形状APIです。
[計算法・検証範囲](docs/proofs/nurbs-curve3.md)を参照してください。

```sh
npm run build
node examples/nurbs-curve3.ts
```

## 厳密なNURBS曲面

`nurbsSurface3`は`[u][v]`の制御点と正の有理数重みから、非周期のテンソル積NURBS曲面を構築します。
各ノット長方形を2変数の同次多項式として保持し、有理数・代数的実数での評価、偏微分、非単位法線を計算します。

```ts
const surface = nurbsSurface3(
  1, 1,
  [[point3(0n, 0n, 0n), point3(0n, 1n, 0n)],
   [point3(1n, 0n, 0n), point3(1n, 1n, 1n)]],
  [0n, 0n, 1n, 1n], [0n, 0n, 1n, 1n],
);
evaluateNurbsSurface3(surface, '1/2', '1/2'); // (1/2, 1/2, 1/4)
differentialNurbsSurface3(surface, '1/2', '1/2').regular; // この点ではtrue
const iso = nurbsSurfaceIsoCurve3(surface, 'u', '1/2'); // uを固定し、vが動く曲線
const split = splitNurbsSurface3(surface, 'u', '1/2');
split.continuous; // 両側の境界曲線が同じパラメータで一致
```

両方向のノット挿入・分割・反転に対応します。不連続なノットでは`uSide`／`vSide`を指定できます。
法線がゼロの点は`regular: false`を返します。曲面全体の埋め込みや面としての有効性を認定する値ではありません。
`nurbsSurfacePlaneEquations3`は平面との交差を表す厳密な多項式を返し、`nurbsSurfaceOnPlane3`は曲面全体の平面所属を判定します。
パッチごとの平面断面の追跡は後述します。トリムされたB-rep面と商用CAD形式の入出力は今後の開発です。
現在の`Surface3`とは別のパラメトリック形状APIです。[計算法・検証範囲](docs/proofs/nurbs-surface3.md)を参照してください。

```sh
npm run build
node examples/nurbs-surface3.ts
```

## 2変数の代数方程式系

`solveBivariateSystem(F, G)`は有理係数多項式の共通ゼロ集合を、共通因子の暗黙的なゼロ集合と、その外側の孤立交点に分けます。
孤立交点は代数的実数の座標として保持し、消去式で生じる余分な候補は元の方程式で厳密に除外します。

```ts
const U = new BivariatePolynomial([[], [1n]]);
const V = new BivariatePolynomial([[0n, 1n]]);
const one = new BivariatePolynomial([[1n]]);
const circle = U.mul(U).add(V.mul(V)).sub(one);
const result = solveBivariateSystem(circle, U.sub(V));
result.points.length; // 2: (±sqrt(1/2), ±sqrt(1/2))、同符号
```

`gcdBivariate`・`divideBivariateExact`・`resultantBivariate`も利用できます。
共通因子には実曲線だけでなく、実点を持たない式や孤立した実点を表す式も含まれます。
共通因子の実ゼロ集合の形状・接続はまだ展開せず、その内部の孤立点も暗黙的な式に保持します。
矩形内のゼロ集合の追跡は後述します。B-repへの接続には追加の処理が必要です。[計算法・完全性・検証範囲](docs/proofs/bivariate-system.md)を参照してください。

```sh
npm run build
node examples/bivariate-system.ts
```

## 代数曲線の接続とNURBS曲面の平面断面

`traceAlgebraicCurve2`は有理数の矩形内で、暗黙的な曲線を厳密な頂点・枝・接続成分へ分解します。
垂直成分、交差、尖点、孤立点、境界上だけの接触も保持します。枝は根の順位で表す暗黙曲線で、直線近似ではありません。

```ts
const graph = traceAlgebraicCurve2(circle, {
  uMin: -2n, uMax: 2n, vMin: -2n, vMax: 2n,
});
graph.components.length; // 1: 円周
const section = intersectNurbsSurfacePlane3(surface, plane3(0n, 0n, 1n, '-1/4'));
const p = nurbsPlaneSectionEdgePoint3(section, 0, 0, '1/2');
```

`intersectNurbsSurfacePlane3`はパッチごとのパラメータ空間のグラフと、平面上に含まれるパッチを返します。
一点だけの接触も頂点として保持します。辺の評価引数は通常の枝では`u`、垂直成分では`v`です。
パッチ境界の統合、空間上の自己重複の解決、トリムされたB-rep面への接続は今後の開発です。
パラメータ空間の接続成分を、そのまま空間上の接続成分とは認定しません。
[構成・完全性・検証範囲](docs/proofs/algebraic-curve-topology2.md)を参照してください。

```sh
npm run build
node examples/nurbs-plane-section3.ts
```
